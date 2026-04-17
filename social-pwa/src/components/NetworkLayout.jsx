import { useState } from 'react';
import Network from './Network';
import Chat from './Chat';

// Componente Wrapper para gerenciar se mostra a lista de amigos ou a tela de chat
export default function NetworkLayout({ session }) {
  const [activeChatUser, setActiveChatUser] = useState(null);

  if (activeChatUser) {
    return <Chat session={session} selectedUser={activeChatUser} onBack={() => setActiveChatUser(null)} />;
  }

  return <Network session={session} onOpenChat={setActiveChatUser} />;
}
