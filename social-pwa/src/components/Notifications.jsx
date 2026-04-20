import { useState, useEffect } from 'react';
import { Heart, UserPlus, MessageCircle, CheckCircle2, Share2, Bell } from 'lucide-react';
import EmptyState from './EmptyState';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
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
          *,
          actor:actor_id (full_name, avatar_url)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);

      // Marca como lidas
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

    const channelId = `notifications-${session.user.id}`;
    let channel = supabase.getChannels().find(c => c.topic === `realtime:${channelId}`);

    if (!channel) {
      channel = supabase.channel(channelId);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, fetchNotifications);
      channel.subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session.user.id]);

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-current" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-primary-500" />;
      case 'connection_request': return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'connection_accepted': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'repost': return <Share2 className="w-5 h-5 text-indigo-500" />;
      case 'message': return <MessageCircle className="w-5 h-5 text-teal-500" />;
      default: return <MessageCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMessage = (notification) => {
    const name = notification.actor?.full_name || 'Alguém';
    switch (notification.type) {
      case 'like': return <><span className="font-bold">{name}</span> curtiu sua publicação.</>;
      case 'comment': return <><span className="font-bold">{name}</span> comentou na sua publicação.</>;
      case 'connection_request': return <><span className="font-bold">{name}</span> enviou um convite de conexão.</>;
      case 'connection_accepted': return <><span className="font-bold">{name}</span> aceitou seu convite.</>;
      case 'repost': return <><span className="font-bold">{name}</span> compartilhou sua publicação.</>;
      case 'message': return <><span className="font-bold">{name}</span> enviou uma mensagem para você.</>;
      default: return <><span className="font-bold">{name}</span> interagiu com você.</>;
    }
  };

  if (loading) return <div className="text-center p-8">Carregando notificações...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Notificações</h2>
      </div>

      <div className="divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Bell}
              title="Nenhuma notificação"
              description="Você ainda não tem novas notificações."
            />
          </div>
        ) : (
          notifications.map((notif) => {
            let linkTo = '#';

            if (notif.type === 'message') {
              linkTo = `/chat/${notif.actor_id}`;
            } else if (notif.type === 'connection_request' || notif.type === 'connection_accepted') {
              linkTo = '/network';
            } else if (notif.post_id) {
              linkTo = `/post/${notif.post_id}`;
            } else if (notif.type === 'like' && notif.reference_id) { // comment like -> redirect to post if possible, but we don't have post_id on comment_like notif easily without join, assume we redirect to network or we can just make it unclickable. Wait, comment trigger actually has post_id! Let's check trigger.
              // Actually comment like trigger passes comment_id in reference_id.
              linkTo = '#';
            }

            const content = (
              <>
                <div className="relative shrink-0">
                  <img
                    src={notif.actor?.avatar_url}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    {getIcon(notif.type)}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    {getMessage(notif)}
                  </p>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {dayjs(notif.created_at).fromNow()}
                  </span>
                </div>
              </>
            );

            if (linkTo !== '#') {
               return (
                  <Link
                    to={linkTo}
                    key={notif.id}
                    className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-primary-50/30' : ''} cursor-pointer`}
                  >
                    {content}
                  </Link>
               );
            }

            return (
              <div
                key={notif.id}
                className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-primary-50/30' : ''}`}
              >
                {content}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
