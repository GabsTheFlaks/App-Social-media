import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Chat from './Chat';

export default function ChatRoute({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setSelectedUser(data);
      } catch (error) {
        console.error('Erro ao buscar usuário do chat:', error);
        navigate('/network'); // Redirect back if user not found
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, navigate]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (!selectedUser) return null;

  return (
    <Chat
      session={session}
      selectedUser={selectedUser}
      onBack={() => navigate(-1)} // Volta para a tela anterior (pode ser o perfil ou a rede)
    />
  );
}
