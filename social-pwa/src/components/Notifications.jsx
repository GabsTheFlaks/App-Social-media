import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, UserPlus, CheckCircle2, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

export default function Notifications({ session }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id, type, read, created_at, post_id,
          actor:actor_id ( id, full_name, avatar_url )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);

      // Marca como lidas silenciosamente
      const unreadIds = data?.filter(n => !n.read).map(n => n.id) || [];
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unreadIds);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [session.user.id]);

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-current" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-blue-500 fill-current" />;
      case 'connection_request': return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'connection_accepted': return <CheckCircle2 className="w-5 h-5 text-primary-500" />;
      default: return null;
    }
  };

  const getNotificationMessage = (n) => {
    const name = <span className="font-semibold text-gray-900">{n.actor?.full_name}</span>;
    switch (n.type) {
      case 'like': return <p>{name} curtiu a sua publicação.</p>;
      case 'comment': return <p>{name} comentou na sua publicação.</p>;
      case 'connection_request': return <p>{name} enviou um convite de conexão.</p>;
      case 'connection_accepted': return <p>{name} aceitou seu convite de conexão.</p>;
      default: return <p>Nova notificação de {name}.</p>;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando notificações...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="font-bold text-lg text-gray-900">Notificações</h2>
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Você não tem nenhuma notificação no momento.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-4 flex gap-4 items-start transition-colors hover:bg-gray-50 ${!n.read ? 'bg-blue-50/30' : ''}`}
            >
              <div className="relative shrink-0">
                <img
                  src={n.actor?.avatar_url || 'https://i.pravatar.cc/150'}
                  alt={n.actor?.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                  {getNotificationIcon(n.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800">
                  {getNotificationMessage(n)}
                </div>
                <span className="text-xs text-gray-400 capitalize mt-1 block">
                  {dayjs(n.created_at).fromNow()}
                </span>
              </div>

              <button
                onClick={() => deleteNotification(n.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
