import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageUtils';
import { Send, ArrowLeft, Loader2, MessageSquare, Image as ImageIcon, X, Mic, StopCircle, Trash2 } from 'lucide-react';
import { useOnlineUsers } from './OnlinePresence';
import dayjs from 'dayjs';

export default function Chat({ session, onBack, selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const isCancelledRef = useRef(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const channelRef = useRef(null);
  const onlineUsers = useOnlineUsers(session);
  const isOnline = onlineUsers.has(selectedUser.id);


  const handleDeleteChat = async () => {
    setIsDeleting(true);
    try {
      // Atualizar todas as mensagens onde sou o sender
      await supabase
        .from('messages')
        .update({ deleted_by_sender: true })
        .eq('sender_id', session.user.id)
        .eq('receiver_id', selectedUser.id);

      // Atualizar todas as mensagens onde sou o receiver
      await supabase
        .from('messages')
        .update({ deleted_by_receiver: true })
        .eq('receiver_id', session.user.id)
        .eq('sender_id', selectedUser.id);

      // Limpar as mensagens locais e voltar para a lista
      setMessages([]);
      setShowDeleteModal(false);
      if (onBack) onBack();
    } catch (err) {
      console.error('Erro ao apagar chat', err);
    } finally {
      setIsDeleting(false);
    }
  };


  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        // Filtrar mensagens deletadas da nossa perspectiva
        for (let i = data.length - 1; i >= 0; i--) {
          const msg = data[i];
          if (msg.sender_id === session.user.id && msg.deleted_by_sender) {
            data.splice(i, 1);
          } else if (msg.receiver_id === session.user.id && msg.deleted_by_receiver) {
            data.splice(i, 1);
          }
        }
      }

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();

      // Marca mensagens como lidas
      const unreadIds = data?.filter(m => m.receiver_id === session.user.id && !m.read).map(m => m.id) || [];
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ read: true }).in('id', unreadIds);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    const sortedIds = [session.user.id, selectedUser.id].sort();

    // Canal exclusivo para DADOS (Novas Mensagens)
    const dbChannelId = `chat-db-${sortedIds[0]}-${sortedIds[1]}`;
    let dbChannel = supabase.getChannels().find(c => c.topic === `realtime:${dbChannelId}`);

    if (!dbChannel) {
      dbChannel = supabase.channel(dbChannelId);
      dbChannel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const msg = payload.new;
        if ((msg.sender_id === session.user.id && msg.receiver_id === selectedUser.id) ||
            (msg.sender_id === selectedUser.id && msg.receiver_id === session.user.id)) {

          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            const isOptimisticDuplicate = prev.find(m =>
               m.id.toString().includes('.') &&
               m.content === msg.content &&
               m.sender_id === msg.sender_id
            );
            if (isOptimisticDuplicate) {
                return prev.map(m => m === isOptimisticDuplicate ? msg : m);
            }
            return [...prev, msg];
          });
          scrollToBottom();
        }
      });
      dbChannel.subscribe();
    }

    // Canal exclusivo para PRESENÇA (Digitando)
    const presenceChannelId = `chat-presence-${sortedIds[0]}-${sortedIds[1]}`;
    let presenceChannel = supabase.getChannels().find(c => c.topic === `realtime:${presenceChannelId}`);

    if (!presenceChannel) {
      presenceChannel = supabase.channel(presenceChannelId, {
        config: { presence: { key: session.user.id } }
      });

      channelRef.current = presenceChannel;

      presenceChannel.on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        let typing = false;
        for (const [key, presences] of Object.entries(state)) {
          if (key === selectedUser.id && presences[0]?.typing) {
            typing = true;
          }
        }
        setIsTyping(typing);
      });

      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ typing: false });
        }
      });
    }

    return () => {
      if (dbChannel) supabase.removeChannel(dbChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, [session.user.id, selectedUser.id]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (channelRef.current) {
      channelRef.current.track({ typing: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        if (channelRef.current) {
          await channelRef.current.track({ typing: false });
        }
      }, 2000);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isCancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        // Parar todas as faixas do microfone para desligar a luz vermelha de gravação no navegador
        stream.getTracks().forEach(track => track.stop());

        if (isCancelledRef.current) {
           return;
        }

        // Faz o upload
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Inicia cronômetro
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancelledRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
      setRecordingDuration(0);
    }
  };

  const handleAudioUpload = async (audioBlob) => {
    // Se o blob estiver vazio ou zerado (ex: cancelado), não faz nada
    if (!audioBlob || audioBlob.size === 0) return;

    try {
      setUploadingImage(true); // Reusing uploading state for loader
      const fileName = `${session.user.id}-${Math.random()}.webm`;
      const filePath = `chat-audio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath);

      const audioUrl = publicUrlData.publicUrl;

      // O formato do link determinará como será renderizado. Enviaremos o link.
      const { error: msgError } = await supabase.from('messages').insert([{
        sender_id: session.user.id,
        receiver_id: selectedUser.id,
        content: audioUrl
      }]);

      if (msgError) throw msgError;
      scrollToBottom();
    } catch (error) {
      console.error('Erro ao enviar áudio', error);
      alert('Erro ao enviar áudio.');
    } finally {
      setUploadingImage(false);
      setRecordingDuration(0);
    }
  };

  const handleImageUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;

      setUploadingImage(true);
      const file = e.target.files[0];
      const compressedFile = await compressImage(file);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `chat/${fileName}`;

      // Upload no Storage
      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // Pega URL Publica
      const { data: publicUrlData } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // Envia a mensagem com a imagem (usamos content = ' ' para satisfazer not null caso exigido, ou url pura se for assim na tabela)
      const { error: msgError } = await supabase.from('messages').insert([{
        sender_id: session.user.id,
        receiver_id: selectedUser.id,
        content: imageUrl // In a real app we might want a separate column, but reusing content works if we detect URLs
      }]);

      if (msgError) throw msgError;
      scrollToBottom();
    } catch (error) {
      console.error('Erro ao enviar imagem', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const contentToSend = newMessage.trim();

    // Optimistic UI update
    const tempId = Math.random().toString();
    const tempMessage = {
      id: tempId,
      sender_id: session.user.id,
      receiver_id: selectedUser.id,
      content: contentToSend,
      created_at: new Date().toISOString(),
      read: false
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      const { error } = await supabase.from('messages').insert([{
        sender_id: session.user.id,
        receiver_id: selectedUser.id,
        content: contentToSend
      }]);
      if (error) {
        // Revert optimistic update on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw error;
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Chat Header */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-white dark:bg-gray-800 z-10">
        <button onClick={onBack} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative">
          <img src={selectedUser.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">{selectedUser.full_name}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isTyping ? <span className="text-primary-600 italic">digitando...</span> : (isOnline ? 'Online agora' : selectedUser.role)}
          </span>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title="Apagar Conversa"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Inicie uma conversa com {selectedUser.full_name}</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === session.user.id;
            const showTime = idx === 0 || dayjs(msg.created_at).diff(dayjs(messages[idx-1].created_at), 'minute') > 5;

            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {showTime && (
                  <span className="text-[10px] text-gray-400 mb-1 mx-1">
                    {dayjs(msg.created_at).format('HH:mm')}
                  </span>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMine
                      ? 'bg-primary-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.content.startsWith('http') && (msg.content.includes('supabase.co') || msg.content.includes('chat')) ? (
                    msg.content.endsWith('.webm') || msg.content.endsWith('.mp3') || msg.content.includes('chat-audio') ? (
                      <audio controls className="max-w-[200px] sm:max-w-xs outline-none">
                        <source src={msg.content} type="audio/webm" />
                        Seu navegador não suporta áudio.
                      </audio>
                    ) : (
                      <img
                        src={msg.content}
                        alt="Imagem"
                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                        onClick={() => setLightboxImage(msg.content)}
                      />
                    )
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            );
          })
        )}
        {isTyping && (
          <div className="flex items-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl rounded-tl-none px-4 py-2 text-xs shadow-sm italic flex gap-1 items-center">
               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex gap-2 items-center">
        {!isRecording ? (
          <>
            <label className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition cursor-pointer">
              {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-primary-500"
            />
            {newMessage.trim() ? (
              <button
                type="submit"
                className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between bg-red-50 rounded-full px-4 py-1.5 border border-red-100">
            <div className="flex items-center gap-2 text-red-600">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">Gravando... 00:{recordingDuration.toString().padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-full"
                title="Cancelar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="p-1.5 bg-red-500 text-white hover:bg-red-600 transition rounded-full shadow-sm"
                title="Enviar"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </form>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-50"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Fullscreen"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Apagar conversa?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Esta ação apagará todo o histórico de mensagens apenas para você. O outro usuário ainda poderá ver as mensagens.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteChat}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Apagando...' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
