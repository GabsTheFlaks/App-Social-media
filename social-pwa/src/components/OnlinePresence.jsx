import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Hook global para rastrear presença de usuários.
// Em um app grande, seria melhor colocar isso num Provider Context.
// Como é um PWA simples, vamos exportar um objeto observável.

// Singleton para guardar o estado online fora do ciclo do React
let globalOnlineUsers = new Set();
let subscribers = new Set();
let channelInit = false;

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback(new Set(globalOnlineUsers)));
};

export const useOnlineUsers = (session) => {
  const [onlineUsers, setOnlineUsers] = useState(globalOnlineUsers);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Register this component to receive updates
    subscribers.add(setOnlineUsers);

    if (!channelInit) {
      channelInit = true;
      const channelId = 'global-presence';
      const channel = supabase.channel(channelId, {
        config: {
          presence: { key: session.user.id },
        },
      });

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineSet = new Set();
        for (const key of Object.keys(state)) {
          onlineSet.add(key);
        }
        globalOnlineUsers = onlineSet;
        notifySubscribers();
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    }

    return () => {
      subscribers.delete(setOnlineUsers);
    };
  }, [session?.user?.id]);

  return onlineUsers;
};
