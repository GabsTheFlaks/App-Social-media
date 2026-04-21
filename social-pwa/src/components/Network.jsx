import { useState, useEffect } from 'react';
import { UserPlus, Check, X, Clock, UserCheck, Search, MessageSquare, UserMinus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Network({ session, onOpenChat }) {
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      // 1. Busca todos os usuários, exceto eu mesmo
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', session.user.id);

      // 2. Busca todas as conexões envolvendo o usuário logado
      const { data: myConnections } = await supabase
        .from('connections')
        .select('*')
        .or(`follower_id.eq.${session.user.id},following_id.eq.${session.user.id}`);

      setConnections(myConnections || []);
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channelId = `network-connections-${session.user.id}`;
    let channel = supabase.getChannels().find(c => c.topic === `realtime:${channelId}`);

    if (!channel) {
      channel = supabase.channel(channelId);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, fetchData);
      channel.subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session.user.id]);

  const handleConnect = async (targetUserId) => {
    try {
      const { error } = await supabase
        .from('connections')
        .insert([{ follower_id: session.user.id, following_id: targetUserId }]);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar convite.');
    }
  };

  const handleAccept = async (connectionId) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!window.confirm("Deseja realmente desfazer essa conexão?")) return;
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleReject = async (connectionId) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const getConnectionStatus = (targetUserId) => {
    const conn = connections.find(
      c => (c.follower_id === session.user.id && c.following_id === targetUserId) ||
           (c.following_id === session.user.id && c.follower_id === targetUserId)
    );

    if (!conn) return 'none'; // Sem conexão
    if (conn.status === 'accepted') return 'accepted'; // Já conectados
    if (conn.follower_id === session.user.id) return 'pending_sent'; // Eu enviei
    return 'pending_received'; // Eu recebi
  };

  if (loading) return <div className="text-center p-8">Carregando rede...</div>;

  const pendingRequests = connections.filter(
    c => c.following_id === session.user.id && c.status === 'pending'
  );

  // Filtrar usuários com base na busca
  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.role?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">

      {/* Barra de Busca (Nova) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-2 flex items-center">
        <Search className="w-5 h-5 text-gray-400 ml-2" />
        <input
          type="text"
          placeholder="Buscar pessoas por nome ou cargo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {pendingRequests.length > 0 && !searchQuery && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Convites Pendentes</h2>
          <div className="space-y-4">
            {pendingRequests.map(req => {
              const requester = users.find(u => u.id === req.follower_id);
              if (!requester) return null;

              return (
                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={requester.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{requester.full_name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{requester.role || 'Membro'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="p-2 bg-gray-200 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          {searchQuery ? 'Resultados da Busca' : 'Pessoas que você talvez conheça'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredUsers.map(user => {
            const status = getConnectionStatus(user.id);
            const conn = connections.find(
               c => (c.follower_id === session.user.id && c.following_id === user.id) ||
                    (c.following_id === session.user.id && c.follower_id === user.id)
            );

            return (
              <div key={user.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center text-center">
                <img src={user.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-gray-100">{user.full_name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 min-h-[32px]">{user.role || 'Sem cargo definido'}</p>

                {status === 'none' && (
                  <button
                    onClick={() => handleConnect(user.id)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 border border-primary-600 text-primary-600 rounded-full font-medium hover:bg-primary-50 transition-colors text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Conectar
                  </button>
                )}

                {status === 'pending_sent' && (
                  <button
                    onClick={() => handleReject(conn.id)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Clock className="w-4 h-4" />
                    Pendente
                  </button>
                )}

                {status === 'accepted' && (
                  <div className="w-full flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChat(user);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors rounded-full font-medium text-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Mensagem
                    </button>
                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Desfazer conexão"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {status === 'pending_received' && (
                  <span className="w-full text-xs text-gray-500 dark:text-gray-400 py-1.5 block">
                    Responda acima
                  </span>
                )}

              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm">Nenhum usuário encontrado na busca.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
