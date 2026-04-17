import { useState, useEffect } from 'react';
import { Camera, MapPin, Briefcase, Mail, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useParams, Link } from 'react-router-dom';
import Post from './Post';
import EmptyState from './EmptyState';

export default function Profile({ session }) {
  const { id: routeId } = useParams();

  // Se existir id na rota, vemos o perfil da pessoa, senão, o nosso.
  const profileId = routeId || session.user.id;
  const isMyProfile = profileId === session.user.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Stats & Connections
  const [stats, setStats] = useState({ connections: 0, posts: 0 });

  // Edit form state
  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    location: '',
    bio: ''
  });
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      // Pega perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          role: profileData.role || '',
          location: profileData.location || '',
          bio: profileData.bio || ''
        });
      }

      // Conta posts
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId);

      // Conta conexões
      const { data: connData } = await supabase
        .from('connections')
        .select('follower_id, following_id')
        .eq('status', 'accepted')
        .or(`follower_id.eq.${profileId},following_id.eq.${profileId}`);

      setStats(prev => ({ ...prev, posts: postsCount || 0, connections: connData?.length || 0 }));
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setLoadingPosts(true);
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (full_name, avatar_url, role),
          likes (user_id),
          comments (*, profiles (full_name, avatar_url), comment_likes (user_id)),
          original:posts!original_post_id (
            id, content, image_url, created_at,
            profiles (full_name, avatar_url)
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      const formattedPosts = (postsData || []).map((post) => ({
        ...post,
        isLiked: post.likes.some((like) => like.user_id === session.user.id),
        likesCount: post.likes.length,
        commentsCount: post.comments?.length || 0,
        showComments: false,
        newComment: ''
      }));

      setPosts(formattedPosts);
    } catch (err) {
      console.error('Erro ao buscar posts do usuario:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
    fetchUserPosts();
    setEditing(false); // Reseta modo de edição se mudar de perfil
  }, [profileId]);

  // Funcoes para interagir com o Post (reutilizadas do Feed adaptadas)
  const handleDeletePost = async (postId) => {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== postId));
      setStats(prev => ({ ...prev, posts: prev.posts > 0 ? prev.posts - 1 : 0 }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLike = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await supabase.from('likes').delete().match({ post_id: postId, user_id: session.user.id });
        setPosts(posts.map(p => p.id === postId ? { ...p, isLiked: false, likesCount: p.likesCount - 1 } : p));
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: session.user.id }]);
        setPosts(posts.map(p => p.id === postId ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleComments = (postId) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, showComments: !p.showComments } : p));
  };

  const handleCommentChange = (postId, text) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, newComment: text } : p));
  };

  const handleCommentSubmit = async (postId, content) => {
    if (!content.trim()) return;
    try {
      const { data, error } = await supabase.from('comments')
        .insert([{ post_id: postId, user_id: session.user.id, content: content.trim() }])
        .select('*, profiles (full_name, avatar_url), comment_likes (user_id)')
        .single();
      if (error) throw error;

      setPosts(posts.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: [...(p.comments || []), data],
          commentsCount: p.commentsCount + 1,
          newComment: ''
        };
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCommentLike = async (postId, commentId, isLiked) => {
    try {
      if (isLiked) {
        await supabase.from('comment_likes').delete().match({ comment_id: commentId, user_id: session.user.id });
        setPosts(posts.map(p => p.id === postId ? { ...p, comments: p.comments.map(c => c.id === commentId ? { ...c, comment_likes: c.comment_likes.filter(l => l.user_id !== session.user.id) } : c) } : p));
      } else {
        await supabase.from('comment_likes').insert([{ comment_id: commentId, user_id: session.user.id }]);
        setPosts(posts.map(p => p.id === postId ? { ...p, comments: p.comments.map(c => c.id === commentId ? { ...c, comment_likes: [...(c.comment_likes || []), { user_id: session.user.id }] } : c) } : p));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRepost = async (postToRepost) => {
    if (!confirm('Deseja compartilhar esta publicação?')) return;
    try {
      const originalId = postToRepost.is_repost ? postToRepost.original_post_id : postToRepost.id;
      const { error } = await supabase.from('posts').insert([{
        user_id: session.user.id,
        content: ' ',
        is_repost: true,
        original_post_id: originalId
      }]);
      if (error) throw error;
      alert('Compartilhado com sucesso!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', session.user.id);

      if (error) throw error;
      setProfile({ ...profile, ...formData });
      setEditing(false);
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar perfil');
    }
  };

  const handleCoverUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;

      setUploadingCover(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      const coverUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_url: coverUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, cover_url: coverUrl }));
    } catch (error) {
      console.error('Erro ao atualizar foto de capa', error);
      alert('Erro ao fazer upload da capa.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;

      setUploadingAvatar(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // Upload no Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pega URL Publica
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Atualiza o Perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      alert('Foto de perfil atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar foto', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) return <div className="text-center p-8">Carregando perfil...</div>;
  if (!profile) return <div className="text-center p-8">Perfil não encontrado.</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        {/* Cover Photo */}
        <div className="h-32 md:h-48 w-full bg-primary-100 relative group">
          {profile.cover_url && (
             <img src={profile.cover_url} alt="Capa" className="w-full h-full object-cover" />
          )}
          {isMyProfile && (
            <label className="absolute top-2 right-2 bg-white/80 p-2 rounded-full hover:bg-white transition cursor-pointer shadow-sm z-10">
              <Camera className="w-4 h-4 text-gray-700" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
              />
            </label>
          )}
          {uploadingCover && (
             <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <span className="text-white text-sm font-medium drop-shadow-md">Atualizando...</span>
             </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          <div className="relative flex justify-between items-end -mt-12 md:-mt-16 mb-4">
            <div className="relative">
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white object-cover ${uploadingAvatar ? 'opacity-50' : ''}`}
              />
              {isMyProfile && (
                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition shadow-md">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>

            {isMyProfile && (
              !editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full font-medium text-sm transition-colors"
                >
                  Editar Perfil
                </button>
              ) : (
                <button
                  onClick={() => setEditing(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
              )
            )}
          </div>

          {!editing ? (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
              <p className="text-gray-600 font-medium mb-2">{profile.role || 'Cargo não definido'}</p>

              <p className="text-gray-700 text-sm mb-4">
                {profile.bio || 'Nenhuma biografia fornecida.'}
              </p>

              <div className="flex flex-col gap-2 text-sm text-gray-500 mb-4">
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>{profile.role || 'Adicione seu cargo atual'}</span>
                </div>
                {isMyProfile && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{session.user.email}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 border-t border-gray-100 pt-4">
                <div className="text-center cursor-pointer hover:opacity-80">
                  <span className="block font-bold text-gray-900">{stats.connections}</span>
                  <span className="text-xs text-gray-500">Conexões</span>
                </div>
                <div className="text-center cursor-pointer hover:opacity-80">
                  <span className="block font-bold text-gray-900">{stats.posts}</span>
                  <span className="text-xs text-gray-500">Posts</span>
                </div>
              </div>
            </div>
          ) : (
            // Form de Edição
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cargo / Título</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                  placeholder="Ex: Desenvolvedor Front-end"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Localização</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                  placeholder="Ex: São Paulo, BR"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sobre / Biografia</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white font-medium py-2 rounded-lg">
                Salvar Alterações
              </button>
            </form>
          )}
        </div>
      </div>

      {!editing && (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 px-1">Publicações de {profile.full_name}</h2>

          {loadingPosts ? (
            <div className="text-center py-8 text-gray-500">Carregando publicações...</div>
          ) : posts.length === 0 ? (
            <EmptyState
              title="Nenhuma publicação"
              description={isMyProfile ? "Você ainda não fez nenhuma publicação." : "Este usuário ainda não publicou nada."}
            />
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <Post
                  key={post.id}
                  post={post}
                  session={session}
                  profile={{...profile, avatar_url: profile.avatar_url}} // Profile context for commenting
                  onDelete={handleDeletePost}
                  onLike={handleLike}
                  onCommentToggle={toggleComments}
                  onCommentChange={handleCommentChange}
                  onCommentSubmit={handleCommentSubmit}
                  onRepost={handleRepost}
                  onImageClick={setLightboxImage}
                  onCommentLike={handleCommentLike}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-50"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Fullscreen"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
