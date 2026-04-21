import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useOnlineUsers } from './OnlinePresence';
import dayjs from 'dayjs';

export default function MessagesList({ session }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const onlineUsers = useOnlineUsers(session);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // Busca todas as mensagens enviadas ou recebidas pelo usuário logado
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(id, full_name, avatar_url, role),
            receiver:receiver_id(id, full_name, avatar_url, role)
          `)
          .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Agrupa por usuário (para mostrar apenas a última mensagem de cada conversa)
        const chatMap = new Map();

        data.forEach(msg => {
          const otherUser = msg.sender_id === session.user.id ? msg.receiver : msg.sender;
          if (!chatMap.has(otherUser.id)) {
            chatMap.set(otherUser.id, {
              user: otherUser,
              lastMessage: msg.content,
              createdAt: msg.created_at,
              unread: msg.receiver_id === session.user.id && !msg.read
            });
          }
        });

        setConversations(Array.from(chatMap.values()));
      } catch (error) {
        console.error('Erro ao buscar conversas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [session.user.id]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[50vh]">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Mensagens</h2>
      </div>

      <div className="divide-y divide-gray-50">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Você ainda não tem nenhuma conversa.</p>
            <button
              onClick={() => navigate('/network')}
              className="mt-4 text-primary-600 hover:underline font-medium text-sm"
            >
              Encontrar conexões
            </button>
          </div>
        ) : (
          conversations.map((chat) => {
            const isOnline = onlineUsers.has(chat.user.id);
            return (
            <div
              key={chat.user.id}
              onClick={() => navigate(`/chat/${chat.user.id}`)}
              className="p-4 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer items-center"
            >
              <div className="relative">
                <img
                  src={chat.user.avatar_url}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover border border-gray-100"
                />
                {isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold text-sm truncate ${chat.unread ? 'text-gray-900' : 'text-gray-800'}`}>
                    {chat.user.full_name}
                  </h3>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                    {dayjs(chat.createdAt).fromNow()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-xs truncate ${chat.unread ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                    {chat.lastMessage.startsWith('http') && chat.lastMessage.includes('chat-audio/') ? '🎤 Áudio' :
                     chat.lastMessage.startsWith('http') && chat.lastMessage.includes('chat/') ? '📷 Imagem' :
                     chat.lastMessage}
                  </p>
                  {chat.unread && (
                    <div className="w-2.5 h-2.5 bg-primary-600 rounded-full ml-2 flex-shrink-0"></div>
                  )}
                </div>
              </div>
            </div>
          )})
        )}
      </div>
    </div>
  );
}
