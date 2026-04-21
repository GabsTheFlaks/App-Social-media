import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Post from './Post';

export default function SinglePost({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles (full_name, avatar_url, role, badges),
            likes (user_id),
            comments (*, profiles (full_name, avatar_url, badges), comment_likes (user_id)),
            saved_posts (user_id),
            original:original_post_id (
              id, content, image_url, image_urls, created_at,
              profiles (full_name, avatar_url, badges)
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        const formattedPost = {
          ...data,
          isLiked: data.likes?.some((like) => like.user_id === session.user.id) || false,
          isSaved: data.saved_posts?.some((saved) => saved.user_id === session.user.id) || false,
          likesCount: data.likes?.length || 0,
          commentsCount: data.comments?.length || 0,
          showComments: true, // Auto open comments on single view
          newComment: ''
        };

        setPost(formattedPost);
      } catch (error) {
        console.error('Erro ao buscar post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, session.user.id]);

  // Handlers para o Post
  const handleLike = async (postId, isLiked) => {
    try {
      setPost(p => ({ ...p, isLiked: !isLiked, likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1 }));
      if (isLiked) {
        await supabase.from('likes').delete().match({ post_id: postId, user_id: session.user.id });
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: session.user.id }]);
      }
    } catch (error) {
      console.error(error);
      setPost(p => ({ ...p, isLiked: isLiked, likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1 }));
    }
  };

  const handleCommentSubmit = async (postId, content) => {
    if (!content.trim()) return;
    try {
      setPost(p => ({ ...p, newComment: '' }));
      const { data, error } = await supabase.from('comments')
        .insert([{ post_id: postId, user_id: session.user.id, content: content.trim() }])
        .select('*, profiles (full_name, avatar_url, badges), comment_likes (user_id)')
        .single();
      if (error) throw error;
      setPost(p => ({ ...p, comments: [...(p.comments || []), data], commentsCount: p.commentsCount + 1 }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCommentChange = (postId, text) => setPost(p => ({ ...p, newComment: text }));
  const toggleComments = () => setPost(p => ({ ...p, showComments: !p.showComments }));

  const handleCommentLike = async (postId, commentId, isLiked) => {
    try {
      setPost(p => ({
        ...p,
        comments: p.comments.map(c => c.id === commentId ? {
          ...c, comment_likes: isLiked ? c.comment_likes.filter(l => l.user_id !== session.user.id) : [...(c.comment_likes || []), { user_id: session.user.id }]
        } : c)
      }));
      if (isLiked) {
        await supabase.from('comment_likes').delete().match({ comment_id: commentId, user_id: session.user.id });
      } else {
        await supabase.from('comment_likes').insert([{ comment_id: commentId, user_id: session.user.id }]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCommentEdit = async (postId, commentId, newContent) => {
    if (!newContent.trim()) return;
    try {
      setPost(p => ({ ...p, comments: p.comments.map(c => c.id === commentId ? { ...c, content: newContent } : c) }));
      await supabase.from('comments').update({ content: newContent }).eq('id', commentId).eq('user_id', session.user.id);
    } catch (err) { console.error(err); }
  };

  const handleCommentDelete = async (postId, commentId) => {
    if (!window.confirm("Deseja realmente apagar este comentário?")) return;
    try {
      setPost(p => ({ ...p, comments: p.comments.filter(c => c.id !== commentId), commentsCount: p.commentsCount - 1 }));
      await supabase.from('comments').delete().eq('id', commentId).eq('user_id', session.user.id);
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta publicação?')) return;
    try {
      await supabase.from('posts').delete().eq('id', postId);
      navigate('/');
    } catch (error) { console.error(error); }
  };

  const handleEditPost = async (postId, newContent) => {
    if (!newContent.trim()) return;
    try {
      setPost(p => ({ ...p, content: newContent }));
      await supabase.from('posts').update({ content: newContent }).eq('id', postId).eq('user_id', session.user.id);
    } catch (err) { console.error(err); }
  };

  const handleSavePost = async (postId, isSaved) => {
    try {
      setPost(p => ({ ...p, isSaved: !isSaved }));
      if (isSaved) {
        await supabase.from('saved_posts').delete().match({ post_id: postId, user_id: session.user.id });
      } else {
        await supabase.from('saved_posts').insert([{ post_id: postId, user_id: session.user.id }]);
      }
    } catch (err) {
      console.error(err);
      setPost(p => ({ ...p, isSaved: isSaved }));
    }
  };

  const handleRepost = async (postToRepost) => {
    if (!window.confirm('Deseja compartilhar esta publicação?')) return;
    try {
      const originalId = postToRepost.is_repost ? postToRepost.original_post_id : postToRepost.id;
      await supabase.from('posts').insert([{ user_id: session.user.id, content: ' ', is_repost: true, original_post_id: originalId }]);
      alert('Compartilhado com sucesso!');
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!post) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Publicação não encontrada ou indisponível.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 mb-4">
        <ArrowLeft className="w-5 h-5" />
        <span>Voltar</span>
      </button>

      <Post
        post={post}
        session={session}
        profile={session.user} // Not fully complete profile context, but fine for comment avatar
        onDelete={handleDeletePost}
        onLike={handleLike}
        onCommentToggle={toggleComments}
        onCommentChange={handleCommentChange}
        onCommentSubmit={handleCommentSubmit}
        onRepost={handleRepost}
        onImageClick={setLightboxImage}
        onCommentLike={handleCommentLike}
        onCommentEdit={handleCommentEdit}
        onCommentDelete={handleCommentDelete}
        onEdit={handleEditPost}
        onSave={handleSavePost}
      />

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
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
