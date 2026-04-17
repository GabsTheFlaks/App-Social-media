import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, Trash2 } from 'lucide-react';
import clsx from 'clsx';
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
      // Busca posts com autor e total de likes
      // Busca posts com autor, curtidas e comentários
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles ( full_name, role, avatar_url ),
          likes ( user_id ),
          comments (
            id,
            content,
            created_at,
            profiles ( full_name, avatar_url )
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Formata dados para UI
      const formattedPosts = postsData.map(post => {
        // Ordena comentários do mais antigo para o mais novo
        const sortedComments = (post.comments || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        return {
          ...post,
          author: post.profiles?.full_name || 'Usuário Desconhecido',
          role: post.profiles?.role || 'Membro',
          avatar: post.profiles?.avatar_url,
          likes_count: post.likes.length,
          liked_by_me: post.likes.some(like => like.user_id === session.user.id),
          comments: sortedComments.map(c => ({
            id: c.id,
            content: c.content,
            created_at: c.created_at,
            author: c.profiles?.full_name,
            avatar: c.profiles?.avatar_url
          }))
        };
      });

      setPosts(formattedPosts);
    } catch (err) {
      console.error("Erro ao buscar posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPosts();

    // Inscreve-se para atualizações no banco (tempo real)
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.user.id]);

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Erro no upload de imagem', error);
      alert('Erro ao fazer upload da imagem.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if ((!newPost.trim() && !selectedImage) || posting || uploadingImage) return;
    setPosting(true);

    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await handleImageUpload(selectedImage);
      }

      // Se não houver texto, passamos uma string vazia para não quebrar a restrição "not null"
      // ou atualizamos o banco para permitir. Vamos passar string vazia por segurança.
      const contentToSave = newPost.trim() ? newPost : ' ';

      const { error } = await supabase
        .from('posts')
        .insert([{ user_id: session.user.id, content: contentToSave, image_url: imageUrl }]);

      if (error) throw error;
      setNewPost('');
      setSelectedImage(null);
    } catch (err) {
      console.error('Erro ao postar:', err);
      alert('Não foi possível enviar a publicação.');
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId, currentlyLiked) => {
    // Atualização Otimista
    setPosts(currentPosts => currentPosts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          liked_by_me: !currentlyLiked,
          likes_count: currentlyLiked ? p.likes_count - 1 : p.likes_count + 1
        };
      }
      return p;
    }));

    try {
      if (currentlyLiked) {
        await supabase
          .from('likes')
          .delete()
          .match({ post_id: postId, user_id: session.user.id });
      } else {
        await supabase
          .from('likes')
          .insert([{ post_id: postId, user_id: session.user.id }]);
      }
    } catch (err) {
      console.error('Erro ao curtir:', err);
      // O ideal seria reverter a atualização otimista aqui em caso de erro.
    }
  };

  const deletePost = async (postId) => {
    if(!window.confirm("Apagar esta publicação?")) return;

    // Atualização otimista
    setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));

    try {
      await supabase.from('posts').delete().eq('id', postId);
    } catch(err) {
      console.error(err);
    }
  }

  // Estado para controlar qual post está com a área de comentários aberta
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const handleComment = async (e, postId) => {
    e.preventDefault();
    if (!commentText.trim() || commenting) return;
    setCommenting(true);

    try {
      const { data: newCommentData, error } = await supabase
        .from('comments')
        .insert([{ post_id: postId, user_id: session.user.id, content: commentText }])
        .select(`
          id,
          content,
          created_at,
          profiles ( full_name, avatar_url )
        `)
        .single();

      if (error) throw error;

      // Atualização Otimista do Comentário
      const formattedComment = {
        id: newCommentData.id,
        content: newCommentData.content,
        created_at: newCommentData.created_at,
        author: newCommentData.profiles?.full_name,
        avatar: newCommentData.profiles?.avatar_url
      };

      setPosts(currentPosts => currentPosts.map(p => {
        if (p.id === postId) {
          return { ...p, comments: [...p.comments, formattedComment] };
        }
        return p;
      }));

      setCommentText('');
    } catch (err) {
      console.error('Erro ao comentar:', err);
    } finally {
      setCommenting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Create Post */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handlePost}>
          <div className="flex gap-3">
            <img
              src={profile?.avatar_url || 'https://i.pravatar.cc/150'}
              alt="Seu Avatar"
              className="w-10 h-10 rounded-full"
            />
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Sobre o que você quer falar?"
              className="w-full resize-none border-none focus:ring-0 text-gray-700 bg-gray-50 rounded-lg p-3 min-h-[80px]"
            />
          </div>

          {selectedImage && (
            <div className="mt-3 relative inline-block">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Preview"
                className="h-32 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <label className="text-gray-500 hover:text-primary-600 cursor-pointer flex items-center gap-2 p-2 rounded-lg hover:bg-primary-50 transition-colors">
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Mídia</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if(e.target.files && e.target.files[0]) setSelectedImage(e.target.files[0])
                }}
              />
            </label>
            <button
              type="submit"
              disabled={(!newPost.trim() && !selectedImage) || posting || uploadingImage}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting || uploadingImage ? 'Enviando...' : 'Publicar'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {loading ? (
          // Skeleton Loader
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
            Nenhuma publicação encontrada. Seja o primeiro a postar!
          </div>
        ) : (
          posts.map(post => (
            <article key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <img src={post.avatar} alt={post.author} className="w-12 h-12 rounded-full" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{post.author}</h3>
                    <p className="text-xs text-gray-500">{post.role}</p>
                    <span className="text-xs text-gray-400 capitalize">{dayjs(post.created_at).fromNow()}</span>
                  </div>
                </div>
                {post.user_id === session.user.id && (
                  <button onClick={() => deletePost(post.id)} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

              {post.image_url && (
                <div className="mb-4 rounded-xl overflow-hidden bg-gray-100">
                  <img src={post.image_url} alt="Post image" className="w-full object-contain max-h-96" />
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 px-1">
                <span>{post.likes_count} {post.likes_count === 1 ? 'curtida' : 'curtidas'}</span>
                <span>{post.comments?.length || 0} {(post.comments?.length === 1) ? 'comentário' : 'comentários'}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button
                  onClick={() => toggleLike(post.id, post.liked_by_me)}
                  className={clsx(
                    "flex-1 flex justify-center items-center gap-2 py-2 rounded-lg transition-colors",
                    post.liked_by_me ? "text-primary-600 hover:bg-primary-50" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Heart className={clsx("w-5 h-5", post.liked_by_me && "fill-current")} />
                  <span className="font-medium text-sm">Curtir</span>
                </button>
                <button
                  onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                  className={clsx(
                    "flex-1 flex justify-center items-center gap-2 py-2 rounded-lg transition-colors",
                    activeCommentPost === post.id ? "text-primary-600 bg-primary-50" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium text-sm hidden sm:inline">Comentar</span>
                </button>
                <button className="flex-1 flex justify-center items-center gap-2 py-2 text-gray-400 cursor-not-allowed rounded-lg transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium text-sm hidden sm:inline">Compartilhar</span>
                </button>
              </div>

              {/* Seção de Comentários (Expandida) */}
              {activeCommentPost === post.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {/* Lista de Comentários */}
                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                    {post.comments?.map(comment => (
                      <div key={comment.id} className="flex gap-2">
                        <img src={comment.avatar || 'https://i.pravatar.cc/150'} alt={comment.author} className="w-8 h-8 rounded-full" />
                        <div className="flex-1 bg-gray-50 p-3 rounded-2xl rounded-tl-none">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-sm text-gray-900">{comment.author}</span>
                            <span className="text-[10px] text-gray-400">{dayjs(comment.created_at).fromNow(true)}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {post.comments?.length === 0 && (
                      <p className="text-center text-sm text-gray-500 py-2">Seja o primeiro a comentar.</p>
                    )}
                  </div>

                  {/* Input de Novo Comentário */}
                  <form onSubmit={(e) => handleComment(e, post.id)} className="flex gap-2 items-center">
                    <img
                      src={profile?.avatar_url || 'https://i.pravatar.cc/150'}
                      alt="Seu Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Escreva um comentário..."
                      className="flex-1 bg-gray-100 border-none text-sm rounded-full px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || commenting}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-full disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
