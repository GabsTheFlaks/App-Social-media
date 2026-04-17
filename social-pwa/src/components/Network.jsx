import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Network({ session }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      // Buscar todos os perfis menos o meu
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', session.user.id)
        .limit(20);

      setUsers(data || []);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session.user.id]);

  const handleConnect = () => {
    alert("O sistema avançado de Conexões entrará na próxima versão! Por enquanto você pode visualizar e interagir com todos no Feed Global.");
  };

  if (loading) return <div className="p-8 text-center">Carregando sugestões...</div>;

  return (
    <div className="space-y-6">
      {/* Suggested Connections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-bold text-lg text-gray-900 mb-4">Membros da Comunidade</h2>
        {users.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">Nenhum outro membro encontrado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {users.map(user => (
              <div key={user.id} className="flex flex-col items-center p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                <img src={user.avatar_url} alt={user.full_name} className="w-20 h-20 rounded-full mb-3" />
                <h3 className="font-semibold text-gray-900 text-center">{user.full_name}</h3>
                <p className="text-xs text-gray-500 text-center mb-4 line-clamp-1">{user.role || 'Membro'}</p>

                <button
                  onClick={() => handleConnect(user.id)}
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
