import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, Trash2, Globe, Users, Repeat2, X } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

export default function Feed({ session }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [visibility, setVisibility] = useState('public');
  const [lightboxImage, setLightboxImage] = useState(null);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) setProfile(data);
  };

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (full_name, avatar_url, role),
          likes (user_id),
          comments (*, profiles (full_name, avatar_url)),
          original:original_post_id (
            id, content, image_url, created_at,
            profiles (full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Filtrar por visibilidade (se é conexoes, verificar se tem conexão aceita)
      let finalPosts = postsData;

      const { data: myConnections } = await supabase
        .from('connections')
        .select('following_id, follower_id')
        .eq('status', 'accepted')
        .or(`follower_id.eq.${session.user.id},following_id.eq.${session.user.id}`);

      const connectionIds = myConnections?.map(c =>
        c.follower_id === session.user.id ? c.following_id : c.follower_id
      ) || [];

      finalPosts = postsData.filter(post => {
        if (post.user_id === session.user.id) return true;
        if (post.visibility === 'public') return true;
        if (post.visibility === 'connections') {
          return connectionIds.includes(post.user_id);
        }
        return false;
      });

      const formattedPosts = finalPosts.map((post) => ({
        ...post,
        isLiked: post.likes.some((like) => like.user_id === session.user.id),
        likesCount: post.likes.length,
        commentsCount: post.comments?.length || 0,
        showComments: false,
        newComment: ''
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPosts();

    // Inscreve-se para atualizações no banco (tempo real)
    const channelId = `feed-posts-likes-${session.user.id}`;
    let channel = supabase.getChannels().find(c => c.topic === `realtime:${channelId}`);

    if (!channel) {
      channel = supabase.channel(channelId);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
             .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchPosts)
             .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchPosts);
      channel.subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session.user.id]);

  const handleImageUpload = async (file) => {
    if (!file) return null;

    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('posts-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('posts-images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload da imagem.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !selectedImage) return;

    setPosting(true);

    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await handleImageUpload(selectedImage);
      }

      const { error } = await supabase.from('posts').insert([
        {
          user_id: session.user.id,
          content: newPost.trim() || ' ',
          image_url: imageUrl,
          visibility: visibility
        },
      ]);

      if (error) throw error;
      setNewPost('');
      setSelectedImage(null);
      fetchPosts();
    } catch (error) {
      console.error('Erro ao postar:', error);
      alert('Ocorreu um erro ao criar a publicação.');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId, isLiked) => {
    if (isLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', session.user.id);
    } else {
      await supabase.from('likes').insert([
        { post_id: postId, user_id: session.user.id },
      ]);
    }
    fetchPosts(); // Recarrega para atualizar contador
  };

  const handleDeletePost = async (postId) => {
    if(!window.confirm("Deseja realmente apagar esta publicação?")) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      fetchPosts();
    } catch (err) {
      console.error("Erro ao deletar", err);
    }
  };

  // Funções de Comentários
  const toggleComments = (postId) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, showComments: !p.showComments } : p));
  };

  const handleCommentChange = (postId, text) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, newComment: text } : p));
  };

  const submitComment = async (postId, content) => {
    if (!content.trim()) return;

    try {
      const { error } = await supabase.from('comments').insert([
        { post_id: postId, user_id: session.user.id, content: content.trim() }
      ]);

      if (error) throw error;

      // Limpar o campo
      setPosts(posts.map(p => p.id === postId ? { ...p, newComment: '' } : p));
      fetchPosts(); // recarregar com o novo comentario
    } catch(err) {
      console.error("Erro ao comentar", err);
    }
  };

  // Função de Repost / Compartilhamento
  const handleRepost = async (post) => {
    if(!window.confirm("Deseja repostar esta publicação no seu perfil?")) return;

    try {
      const originalId = post.is_repost ? post.original_post_id : post.id;

      const { error } = await supabase.from('posts').insert([
        {
          user_id: session.user.id,
          content: '', // Reposts puros não tem conteúdo próprio inicialmente
          is_repost: true,
          original_post_id: originalId,
          visibility: 'public'
        }
      ]);

      if (error) throw error;
      alert("Publicação compartilhada!");
      fetchPosts();
    } catch(err) {
      console.error("Erro ao compartilhar", err);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Create Post Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handlePost}>
          <div className="flex gap-4">
            <img
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}`}
              alt="Avatar"
              className="w-12 h-12 rounded-full object-cover border border-gray-200"
            />
            <div className="flex-1 space-y-3">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Sobre o que você quer falar?"
                className="w-full bg-transparent border-none focus:ring-0 resize-none text-gray-800 placeholder-gray-500 min-h-[60px]"
                rows="2"
              />

              {selectedImage && (
                <div className="relative inline-block mt-2">
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Preview"
                    className="max-h-64 rounded-lg border border-gray-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 px-3 py-2 rounded-full transition-colors cursor-pointer">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">Mídia</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedImage(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {/* Seletor de Visibilidade */}
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="text-xs text-gray-500 bg-gray-50 border-none rounded-full py-1.5 px-3 cursor-pointer hover:bg-gray-100 focus:ring-0"
                  >
                    <option value="public">🌍 Público</option>
                    <option value="connections">👥 Conexões</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={(!newPost.trim() && !selectedImage) || posting || uploadingImage}
                  className="bg-primary-600 text-white px-5 py-2 rounded-full font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(posting || uploadingImage) ? 'Publicando...' : (
                    <>
                      <span>Publicar</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Feed Area */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando feed...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">
            Nenhuma publicação ainda. Seja o primeiro a postar!
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all">
              {/* Indica Repost */}
              {post.is_repost && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 pb-2 border-b border-gray-50">
                  <Repeat2 className="w-4 h-4" />
                  <span>{post.profiles?.full_name} compartilhou isso</span>
                </div>
              )}

              {/* Post Header (Usa dados do original se for repost puro, ou do dono se houver comentário extra - futuramente) */}
              <div className="flex justify-between items-start mb-3">
                <Link to={`/profile/${post.is_repost ? post.original?.profiles?.id || post.original_post_id : post.user_id}`} className="flex items-center gap-3 group">
                  <img
                    src={post.is_repost ? post.original?.profiles?.avatar_url : post.profiles?.avatar_url}
                    alt="User"
                    className="w-10 h-10 rounded-full object-cover border border-gray-100 group-hover:opacity-80 transition"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-primary-600 transition">
                      {post.is_repost ? post.original?.profiles?.full_name : post.profiles?.full_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span>{dayjs(post.is_repost ? post.original?.created_at : post.created_at).fromNow()}</span>
                      <span>•</span>
                      {post.visibility === 'public' ? <Globe className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    </div>
                  </div>
                </Link>
                {post.user_id === session.user.id && (
                   <button
                     onClick={() => handleDeletePost(post.id)}
                     className="text-gray-400 hover:text-red-500 p-1"
                     title="Excluir"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                )}
              </div>

              {/* Post Content */}
              <div className="mb-4">
                <p className="text-gray-800 text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                  {post.is_repost ? post.original?.content : post.content}
                </p>
              </div>

              {/* Post Image */}
              {(post.image_url || (post.is_repost && post.original?.image_url)) && (
                <div
                  className="mb-4 rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => setLightboxImage(post.is_repost ? post.original?.image_url : post.image_url)}
                >
                  <img
                    src={post.is_repost ? post.original?.image_url : post.image_url}
                    alt="Post attachment"
                    className="w-full max-h-96 object-contain hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
              )}

              {/* Stats Bar */}
              <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-2 mb-2 px-1">
                <div className="flex items-center gap-1">
                  {post.likesCount > 0 && (
                    <>
                      <div className="bg-primary-100 text-primary-600 p-0.5 rounded-full">
                        <Heart className="w-3 h-3 fill-current" />
                      </div>
                      <span>{post.likesCount}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  {post.commentsCount > 0 && <span>{post.commentsCount} comentários</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 pt-1">
                <button
                  onClick={() => handleLike(post.id, post.isLiked)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
                    post.isLiked
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Heart className={clsx('w-5 h-5', post.isLiked && 'fill-current')} />
                  <span>Curtir</span>
                </button>
                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Comentar</span>
                </button>
                <button
                  onClick={() => handleRepost(post)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Compartilhar</span>
                </button>
              </div>

              {/* Comments Section */}
              {post.showComments && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                  {/* Create Comment */}
                  <div className="flex gap-3">
                    <img
                      src={profile?.avatar_url}
                      alt="Me"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={post.newComment || ''}
                        onChange={(e) => handleCommentChange(post.id, e.target.value)}
                        placeholder="Adicione um comentário..."
                        className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                        onKeyPress={(e) => e.key === 'Enter' && submitComment(post.id, post.newComment)}
                      />
                      <button
                        onClick={() => submitComment(post.id, post.newComment)}
                        disabled={!post.newComment?.trim()}
                        className="text-primary-600 disabled:opacity-50 p-2"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* List Comments */}
                  <div className="space-y-3 pl-11">
                    {post.comments?.map(comment => (
                      <div key={comment.id} className="flex gap-2">
                        <img
                          src={comment.profiles?.avatar_url}
                          alt="User"
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div className="bg-gray-100 rounded-2xl rounded-tl-none px-3 py-2 text-sm">
                          <span className="font-bold text-gray-900 block">{comment.profiles?.full_name}</span>
                          <span className="text-gray-800">{comment.content}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Lightbox para imagem em tela cheia */}
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
            onClick={(e) => e.stopPropagation()} // Impede que o clique na imagem feche o modal
          />
        </div>
      )}
    </div>
  );
}
