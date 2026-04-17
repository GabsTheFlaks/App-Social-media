import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';

export default function Chat({ session, onBack, selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

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
      channel = supabase.channel(channelId);
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=in.(${session.user.id},${selectedUser.id})`
      }, (payload) => {
        // Verifica dupla se a mensagem pertence a essa conversa (Supabase filter as vezes aceita parcialmente dependendo da regra)
        const msg = payload.new;
        if ((msg.sender_id === session.user.id && msg.receiver_id === selectedUser.id) ||
            (msg.sender_id === selectedUser.id && msg.receiver_id === session.user.id)) {
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
        }
      });
      channel.subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [session.user.id, selectedUser.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const contentToSend = newMessage.trim();
    setNewMessage('');

    // Remove optimistic update to avoid duplicate messages since realtime is fast enough
    try {
      const { error } = await supabase.from('messages').insert([{
        sender_id: session.user.id,
        receiver_id: selectedUser.id,
        content: contentToSend
      }]);
      if (error) throw error;
      scrollToBottom();
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
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
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
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
    </div>
  );
}
