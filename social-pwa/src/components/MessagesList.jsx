import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, Plus, X, Search } from 'lucide-react';
import { useOnlineUsers } from './OnlinePresence';
import dayjs from 'dayjs';

export default function MessagesList({ session }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [connections, setConnections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const onlineUsers = useOnlineUsers(session);

  useEffect(() => {

    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar mensagens
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(id, full_name, avatar_url, role),
            receiver:receiver_id(id, full_name, avatar_url, role)
          `)
          .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
          .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;

        // Filtrar mensagens que foram apagadas pelo lado do usuário logado
        const validMessages = (messagesData || []).filter(msg => {
          if (msg.sender_id === session.user.id && msg.deleted_by_sender) return false;
          if (msg.receiver_id === session.user.id && msg.deleted_by_receiver) return false;
          return true;
        });

        // Agrupa por usuário
        const chatMap = new Map();

        validMessages.forEach(msg => {
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

        // Buscar conexões para o Modal de Novo Chat
        const { data: connectionsData, error: connectionsError } = await supabase
          .from('connections')
          .select(`
            *,
            follower:follower_id(id, full_name, avatar_url, role),
            following:following_id(id, full_name, avatar_url, role)
          `)
          .or(`follower_id.eq.${session.user.id},following_id.eq.${session.user.id}`);

        if (!connectionsError && connectionsData) {
          const uniqueConnections = new Map();
          connectionsData.forEach(conn => {
            const otherUser = conn.follower_id === session.user.id ? conn.following : conn.follower;
            if (otherUser) uniqueConnections.set(otherUser.id, otherUser);
          });
          setConnections(Array.from(uniqueConnections.values()));
        }

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

  }, [session.user.id]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden min-h-[50vh]">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Mensagens</h2>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
          title="Nova Conversa"
        >
          <Plus className="w-5 h-5" />
        </button>
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
              className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer items-center"
            >
              <div className="relative">
                <img
                  src={chat.user.avatar_url}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                />
                {isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold text-sm truncate ${chat.unread ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>
                    {chat.user.full_name}
                  </h3>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                    {dayjs(chat.createdAt).fromNow()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-xs truncate ${chat.unread ? 'font-bold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
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

      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">Nova Conversa</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar conexões..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {connections.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Você ainda não tem conexões.
                </div>
              ) : (
                connections
                  .filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(user => (
                    <div
                      key={user.id}
                      onClick={() => navigate(`/chat/${user.id}`)}
                      className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition-colors"
                    >
                      <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{user.full_name}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
