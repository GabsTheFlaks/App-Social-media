import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, ArrowLeft, Loader2, MessageSquare, Image as ImageIcon, X } from 'lucide-react';
import dayjs from 'dayjs';

export default function Chat({ session, onBack, selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const channelRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });

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

    // Cria um ID de canal único para esta conversa (os IDs precisam estar em ordem alfabética para ser o mesmo para ambos)
    const sortedIds = [session.user.id, selectedUser.id].sort();
    const channelId = `chat-${sortedIds[0]}-${sortedIds[1]}`;

    let channel = supabase.getChannels().find(c => c.topic === `realtime:${channelId}`);

    if (!channel) {
      channel = supabase.channel(channelId, {
        config: { presence: { key: session.user.id } }
      });

      channelRef.current = channel;

      channel.on('postgres_changes', {
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
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Check if the remote user is typing
        let typing = false;
        for (const [key, presences] of Object.entries(state)) {
          if (key === selectedUser.id && presences[0]?.typing) {
            typing = true;
          }
        }
        setIsTyping(typing);
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: false });
        }
      });
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
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

  const handleImageUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;

      setUploadingImage(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `chat/${fileName}`;

      // Upload no Storage
      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, file);

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
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[600px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Chat Header */}
      <div className="p-3 border-b border-gray-100 flex items-center gap-3 bg-white z-10">
        <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={selectedUser.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{selectedUser.full_name}</h3>
          <span className="text-xs text-gray-500">{selectedUser.role}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.content.startsWith('http') && (msg.content.includes('supabase.co') || msg.content.includes('chat/')) ? (
                    <img
                      src={msg.content}
                      alt="Imagem"
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => setLightboxImage(msg.content)}
                    />
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
            <div className="bg-white border border-gray-200 text-gray-500 rounded-2xl rounded-tl-none px-4 py-2 text-xs shadow-sm italic flex gap-1 items-center">
               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center">
        <label className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-full transition cursor-pointer">
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
          className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="p-2 bg-primary-600 text-white rounded-full disabled:opacity-50 hover:bg-primary-700 transition"
        >
          <Send className="w-4 h-4" />
        </button>
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
    </div>
  );
}
