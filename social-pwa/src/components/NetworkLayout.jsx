import { useNavigate } from 'react-router-dom';
import Network from './Network';

// Componente Wrapper refatorado para usar as rotas reais do React Router
export default function NetworkLayout({ session }) {
  const navigate = useNavigate();

  // Ao clicar em abrir chat, redireciona para a Rota de Chat
  const handleOpenChat = (user) => {
    navigate(`/chat/${user.id}`);
  };

  return <Network session={session} onOpenChat={handleOpenChat} />;
}
