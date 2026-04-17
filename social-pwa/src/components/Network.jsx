import { useState, useEffect } from 'react';
import { UserPlus, Check, X, Clock, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Network({ session }) {
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Helper para descobrir o status da conexão com um determinado usuário
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

  // Filtra convites recebidos e pendentes
  const pendingRequests = connections.filter(
    c => c.following_id === session.user.id && c.status === 'pending'
  );

  return (
    <div className="space-y-6">

      {/* Convites Recebidos */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Convites Pendentes</h2>
          <div className="space-y-4">
            {pendingRequests.map(req => {
              const requester = users.find(u => u.id === req.follower_id);
              if (!requester) return null;

              return (
                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={requester.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{requester.full_name}</h3>
                      <p className="text-xs text-gray-500">{requester.role || 'Membro'}</p>
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
                      className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
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

      {/* Sugestões de Conexão */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Pessoas que você talvez conheça</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {users.map(user => {
            const status = getConnectionStatus(user.id);
            // Pega o ID da conexão para usar nos botões de cancelar
            const conn = connections.find(
               c => (c.follower_id === session.user.id && c.following_id === user.id) ||
                    (c.following_id === session.user.id && c.follower_id === user.id)
            );

            return (
              <div key={user.id} className="border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center">
                <img src={user.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover mb-3" />
                <h3 className="font-bold text-gray-900">{user.full_name}</h3>
                <p className="text-xs text-gray-500 mb-4 min-h-[32px]">{user.role || 'Sem cargo definido'}</p>

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
                    className="w-full flex items-center justify-center gap-2 py-1.5 border border-gray-300 text-gray-500 rounded-full font-medium hover:bg-gray-50 transition-colors text-sm"
                  >
                    <Clock className="w-4 h-4" />
                    Pendente
                  </button>
                )}

                {status === 'accepted' && (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-1.5 bg-gray-100 text-gray-600 rounded-full font-medium text-sm cursor-default"
                  >
                    <UserCheck className="w-4 h-4" />
                    Conectado
                  </button>
                )}

                {status === 'pending_received' && (
                  <span className="w-full text-xs text-gray-500 py-1.5 block">
                    Responda acima
                  </span>
                )}

              </div>
            );
          })}

          {users.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              Nenhum outro usuário encontrado na rede.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
