import { useState, useEffect, useRef, useCallback } from 'react';
import { Image as ImageIcon, Send, Users, X, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageUtils';
import Post from './Post';

const POSTS_PER_PAGE = 10;

export default function Feed({ session }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [lightboxImage, setLightboxImage] = useState(null);

  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (loadingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts(posts.length);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, posts.length]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .limit(1);
    if (data && data.length > 0) setProfile(data[0]);
  };

  const fetchPosts = async (offset = 0) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

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
        .order('created_at', { ascending: false })
        .range(offset, offset + POSTS_PER_PAGE - 1);

      if (postsError) throw postsError;

      // Filtrar por visibilidade
      const { data: myConnections } = await supabase
        .from('connections')
        .select('following_id, follower_id')
        .eq('status', 'accepted')
        .or(`follower_id.eq.${session.user.id},following_id.eq.${session.user.id}`);

      const connectionIds = myConnections?.map(c =>
        c.follower_id === session.user.id ? c.following_id : c.follower_id
      ) || [];

      const filteredPosts = postsData.filter(post => {
        if (post.user_id === session.user.id) return true;
        if (post.visibility === 'public') return true;
        if (post.visibility === 'connections') {
          return connectionIds.includes(post.user_id);
        }
        return false;
      });

      const formattedPosts = filteredPosts.map((post) => ({
        ...post,
        isLiked: post.likes.some((like) => like.user_id === session.user.id),
        likesCount: post.likes.length,
        commentsCount: post.comments?.length || 0,
        showComments: false,
        newComment: ''
      }));

      if (offset === 0) {
        setPosts(formattedPosts);
      } else {
        setPosts(prev => {
          // Evitar duplicatas em tempo real
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = formattedPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }

      // Se retornou menos que a página, acabou
      if (postsData.length < POSTS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

    } catch (error) {
      console.error('Erro ao buscar posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPosts(0); // Load initial page

    const channelId = `feed-posts-likes-${session.user.id}`;
    let channel = supabase.getChannels().find(c => c.topic === `realtime:${channelId}`);

    if (!channel) {
      channel = supabase.channel(channelId);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
               // Apenas avisa ou carrega passivamente novos pra não quebrar a paginação.
               // Idealmente inserir apenas no topo, mas para manter simples:
               // se o usuário não rolou ainda (posts.length <= POSTS_PER_PAGE), atualiza
               setPosts(currentPosts => {
                 if (currentPosts.length <= POSTS_PER_PAGE) {
                   fetchPosts(0);
                 }
                 return currentPosts;
               });
             })
             .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
             })
             .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
             });
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

    try {
      const compressedFile = await compressImage(file);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      return null;
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && selectedImages.length === 0) return;

    setPosting(true);
    setUploadingImage(selectedImages.length > 0);

    try {
      // Upload images sequentially to not overwhelm browser/free tier
      const validUrls = [];
      for (const img of selectedImages) {
         const url = await handleImageUpload(img);
         if (url) validUrls.push(url);
      }

      if (selectedImages.length > 0 && validUrls.length === 0) {
        throw new Error('Falha no upload das imagens.');
      }

      const primeiraImagem = validUrls.length > 0 ? validUrls[0] : null;

      const { error } = await supabase.from('posts').insert([
        {
          user_id: session.user.id,
          content: newPost.trim() || ' ',
          image_url: primeiraImagem,
          image_urls: validUrls.length > 0 ? validUrls : null,
          visibility: visibility
        },
      ]);

      if (error) throw error;

      setNewPost('');
      setSelectedImages([]);
      fetchPosts(0); // Volta pro topo
    } catch (error) {
      console.error('Erro ao postar:', error);
      alert('Ocorreu um erro ao criar a publicação. ' + error.message);
    } finally {
      setPosting(false);
      setUploadingImage(false);
    }
  };

  const handleImageSelection = (e) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    if (selectedImages.length + newFiles.length > 5) {
      alert('Você pode selecionar no máximo 5 imagens por postagem.');
      return;
    }

    setSelectedImages(prev => [...prev, ...newFiles]);
  };

  const removeSelectedImage = (indexToRemove) => {
    setSelectedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleLike = async (postId, isLiked) => {
    try {
      // Optimistic Update
      setPosts(currentPosts => currentPosts.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          isLiked: !isLiked,
          likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1
        };
      }));

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes').insert([
          { post_id: postId, user_id: session.user.id },
        ]);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao curtir post:', error);
      // Revert in case of error (simplification: let a refresh fix it or manually revert here)
      setPosts(currentPosts => currentPosts.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          isLiked: isLiked, // revert
          likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1 // revert
        };
      }));
    }
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
      setPosts(posts.filter(p => p.id !== postId)); // Atualiza local
    } catch (err) {
      console.error("Erro ao deletar", err);
    }
  };

  const toggleComments = (postId) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, showComments: !p.showComments } : p));
  };

  const handleCommentLike = async (postId, commentId, isLiked) => {
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .match({ comment_id: commentId, user_id: session.user.id });
        if (error) throw error;

        // Optimistic update
        setPosts(posts.map(p => {
          if (p.id !== postId) return p;
          return {
            ...p,
            comments: p.comments.map(c => {
               if (c.id !== commentId) return c;
               return {
                 ...c,
                 comment_likes: c.comment_likes.filter(l => l.user_id !== session.user.id)
               };
            })
          };
        }));

      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert([{ comment_id: commentId, user_id: session.user.id }]);
        if (error) throw error;

        // Optimistic update
        setPosts(posts.map(p => {
          if (p.id !== postId) return p;
          return {
            ...p,
            comments: p.comments.map(c => {
               if (c.id !== commentId) return c;
               return {
                 ...c,
                 comment_likes: [...(c.comment_likes || []), { user_id: session.user.id }]
               };
            })
          };
        }));
      }
    } catch (error) {
      console.error('Erro ao curtir comentário:', error);
    }
  };

  const handleEditPost = async (postId, newContent) => {
    if (!newContent.trim()) return;
    try {
      // Optimistic Update
      setPosts(currentPosts => currentPosts.map(p => p.id === postId ? { ...p, content: newContent } : p));

      const { error } = await supabase
        .from('posts')
        .update({ content: newContent })
        .eq('id', postId)
        .eq('user_id', session.user.id);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao editar post", err);
      alert("Erro ao editar post.");
    }
  };

  const handleCommentChange = (postId, text) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, newComment: text } : p));
  };

  const submitComment = async (postId, content) => {
    if (!content.trim()) return;

    try {
      const { data, error } = await supabase.from('comments')
        .insert([{ post_id: postId, user_id: session.user.id, content: content.trim() }])
        .select('*, profiles (full_name, avatar_url), comment_likes (user_id)')
        .single();

      if (error) throw error;

      // Update locally to show the new comment immediately
      setPosts(posts.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: [...(p.comments || []), data],
          commentsCount: p.commentsCount + 1,
          newComment: ''
        };
      }));
    } catch(err) {
      console.error("Erro ao comentar", err);
    }
  };

  const handleCommentEdit = async (postId, commentId, newContent) => {
    if (!newContent.trim()) return;
    try {
      // Optimistic update
      setPosts(posts.map(p => p.id === postId ? {
        ...p,
        comments: p.comments.map(c => c.id === commentId ? { ...c, content: newContent } : c)
      } : p));

      const { error } = await supabase
        .from('comments')
        .update({ content: newContent })
        .eq('id', commentId)
        .eq('user_id', session.user.id);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao editar comentário", err);
    }
  };

  const handleCommentDelete = async (postId, commentId) => {
    if (!window.confirm("Deseja realmente apagar este comentário?")) return;
    try {
      // Optimistic update
      setPosts(posts.map(p => p.id === postId ? {
        ...p,
        comments: p.comments.filter(c => c.id !== commentId),
        commentsCount: p.commentsCount - 1
      } : p));

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', session.user.id);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao apagar comentário", err);
    }
  };

  const handleRepost = async (post) => {
    if(!window.confirm("Deseja repostar esta publicação no seu perfil?")) return;

    try {
      const originalId = post.is_repost ? post.original_post_id : post.id;

      const { error } = await supabase.from('posts').insert([
        {
          user_id: session.user.id,
          content: '',
          is_repost: true,
          original_post_id: originalId,
          visibility: 'public'
        }
      ]);

      if (error) throw error;
      alert("Publicação compartilhada!");
      fetchPosts(0);
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

              {selectedImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                  {selectedImages.map((img, index) => (
                    <div key={index} className="relative inline-block flex-shrink-0">
                      <img
                        src={URL.createObjectURL(img)}
                        alt="Preview"
                        className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
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
                      multiple
                      className="hidden"
                      onChange={handleImageSelection}
                      disabled={selectedImages.length >= 5}
                    />
                  </label>

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
                  disabled={(!newPost.trim() && selectedImages.length === 0) || posting || uploadingImage}
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
        {loading && posts.length === 0 ? (
          <div className="flex justify-center items-center py-8">
             <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-xl border border-gray-100">
             <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <Users className="w-8 h-8 text-gray-400" />
             </div>
             <h3 className="font-bold text-gray-900 mb-1">Seu feed está vazio</h3>
             <p className="text-gray-500 text-sm mb-4">Acompanhe as publicações da sua rede.</p>
             <Link to="/network" className="bg-primary-600 text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-primary-700">
               Encontrar pessoas
             </Link>
          </div>
        ) : (
          posts.map((post, index) => {
            const isLastPost = posts.length === index + 1;

            return (
              <div ref={isLastPost ? lastPostElementRef : null} key={post.id}>
                <Post
                  post={post}
                  session={session}
                  profile={profile}
                  onDelete={handleDeletePost}
                  onLike={handleLike}
                  onCommentToggle={toggleComments}
                  onCommentChange={handleCommentChange}
                  onCommentSubmit={submitComment}
                  onRepost={handleRepost}
                  onImageClick={setLightboxImage}
                  onCommentLike={handleCommentLike}
                  onCommentEdit={handleCommentEdit}
                  onCommentDelete={handleCommentDelete}
                  onEdit={handleEditPost}
                />
              </div>
            );
          })
        )}

        {loadingMore && (
           <div className="flex justify-center items-center py-4">
             <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
           </div>
        )}
        {!hasMore && posts.length > 0 && (
           <div className="text-center py-4 text-gray-400 text-sm">
             Você chegou ao fim do feed.
           </div>
        )}
      </div>

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
