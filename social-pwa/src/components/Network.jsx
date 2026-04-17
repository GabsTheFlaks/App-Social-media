import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Network({ session }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState([]);

  const fetchNetworkData = async () => {
    try {
      // 1. Buscar Convites Recebidos Pendentes
      const { data: reqData } = await supabase
        .from('connections')
        .select('id, follower_id, status, profiles!connections_follower_id_fkey(full_name, role, avatar_url)')
        .eq('following_id', session.user.id)
        .eq('status', 'pending');

      setRequests(reqData || []);

      // 2. Buscar Todas as minhas conexões (para não sugerir quem já é amigo/pendente)
      const { data: myConnections } = await supabase
        .from('connections')
        .select('*')
        .or(`follower_id.eq.${session.user.id},following_id.eq.${session.user.id}`);

      const connectedIds = (myConnections || []).map(c =>
        c.follower_id === session.user.id ? c.following_id : c.follower_id
      );

      // 3. Buscar Sugestões (pessoas que não sou eu e não estão nas minhas conexões)
      let query = supabase.from('profiles').select('*').neq('id', session.user.id).limit(20);
      if (connectedIds.length > 0) {
        query = query.not('id', 'in', `(${connectedIds.join(',')})`);
      }

      const { data: usersData } = await query;
      setUsers(usersData || []);

    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, [session.user.id]);

  const sendRequest = async (userId) => {
    // UI Otimista
    setUsers(users.filter(u => u.id !== userId));
    try {
      await supabase
        .from('connections')
        .insert([{ follower_id: session.user.id, following_id: userId, status: 'pending' }]);
    } catch (err) {
      console.error("Erro ao enviar convite", err);
    }
  };

  const handleAccept = async (connectionId) => {
    setRequests(requests.filter(r => r.id !== connectionId));
    try {
      await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);
    } catch (err) {
      console.error("Erro ao aceitar", err);
    }
  };

  const handleDecline = async (connectionId) => {
    setRequests(requests.filter(r => r.id !== connectionId));
    try {
      await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);
    } catch (err) {
      console.error("Erro ao recusar", err);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando sua rede...</div>;

  return (
    <div className="space-y-6">

      {/* Convites Recebidos */}
      {requests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-bold text-lg text-gray-900 mb-4">Convites ({requests.length})</h2>
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <img src={req.profiles?.avatar_url} alt={req.profiles?.full_name} className="w-12 h-12 rounded-full" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{req.profiles?.full_name}</h3>
                    <p className="text-xs text-gray-500">{req.profiles?.role || 'Membro'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDecline(req.id)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleAccept(req.id)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors">
                    <UserCheck className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Connections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-bold text-lg text-gray-900 mb-4">Membros que você pode conhecer</h2>
        {users.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">Não há sugestões no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {users.map(user => (
              <div key={user.id} className="flex flex-col items-center p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                <img src={user.avatar_url} alt={user.full_name} className="w-20 h-20 rounded-full mb-3" />
                <h3 className="font-semibold text-gray-900 text-center">{user.full_name}</h3>
                <p className="text-xs text-gray-500 text-center mb-4 line-clamp-1">{user.role || 'Membro'}</p>

                <button
                  onClick={() => sendRequest(user.id)}
                  className="w-full py-2 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-colors bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-50"
                >
                  <UserPlus className="w-4 h-4" />
                  Conectar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
