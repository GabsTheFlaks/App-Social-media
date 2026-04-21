import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Send, Trash2, Globe, Users, Repeat2, Edit2, Check, X, ChevronLeft, ChevronRight, Bookmark, MoreVertical, Link as LinkIcon, UserMinus } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import LinkPreview from './LinkPreview';
import Badge from './Badge';

export default function Post({
  post,
  session,
  profile,
  onDelete,
  onLike,
  onCommentToggle,
  onCommentChange,
  onCommentSubmit,
  onRepost,
  onImageClick,
  onCommentLike,
  onCommentDelete,
  onCommentEdit,
  onEdit,
  onSave,
  onUnfollow
}) {
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editPostText, setEditPostText] = useState(post.content);

  const startEditPost = () => {
    setIsEditingPost(true);
    setEditPostText(post.content);
  };

  const cancelEditPost = () => {
    setIsEditingPost(false);
    setEditPostText(post.content);
  };

  const submitEditPost = () => {
    if (!editPostText.trim()) return;
    onEdit(post.id, editPostText.trim());
    setIsEditingPost(false);
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const submitEditComment = () => {
    if (!editCommentText.trim()) return;
    onCommentEdit(post.id, editingCommentId, editCommentText.trim());
    cancelEditComment();
  };

  // Detecta URLs no texto
  const extractUrls = (text) => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const urls = extractUrls(post.is_repost ? post.original?.content : post.content);
  const firstUrl = urls.length > 0 ? urls[0] : null;

  // Lógica do Carrossel de Imagens
  const postImages = post.is_repost
    ? (post.original?.image_urls || (post.original?.image_url ? [post.original.image_url] : []))
    : (post.image_urls || (post.image_url ? [post.image_url] : []));

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % postImages.length);
  };

  const handleNativeShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post de ${post.profiles?.full_name}`,
          text: post.content ? post.content.substring(0, 50) + '...' : 'Confira esta publicação.',
          url: postUrl,
        });
      } catch (err) {
        console.error('Erro ao compartilhar', err);
      }
    } else {
      navigator.clipboard.writeText(postUrl);
      alert('Link copiado para a área de transferência!');
    }
    setShowMenu(false);
  };


  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + postImages.length) % postImages.length);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 transition-all">
      {post.is_repost && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3 pb-2 border-b border-gray-50">
          <Repeat2 className="w-4 h-4" />
          <span>{post.profiles?.full_name} compartilhou isso</span>
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <Link to={`/profile/${post.is_repost ? post.original?.profiles?.id || post.original_post_id : post.user_id}`} className="flex items-center gap-3 group">
          <img
            src={post.is_repost ? post.original?.profiles?.avatar_url : post.profiles?.avatar_url}
            alt="User"
            className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800 group-hover:opacity-80 transition"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm group-hover:text-primary-600 transition">
                {post.is_repost ? post.original?.profiles?.full_name : post.profiles?.full_name}
              </h3>
              {(post.is_repost ? post.original?.profiles?.badges : post.profiles?.badges)?.map(badge => (
                <Badge key={badge} type={badge} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{dayjs(post.is_repost ? post.original?.created_at : post.created_at).fromNow()}</span>
              <span>•</span>
              {post.visibility === 'public' ? <Globe className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            </div>
          </div>
        </Link>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 z-20 py-1">
                {post.user_id === session.user.id && !post.is_repost && !isEditingPost && (
                  <>
                    <button
                      onClick={() => { startEditPost(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>
                    <button
                      onClick={() => { onDelete(post.id); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                  </>
                )}
                {onSave && (
                  <button
                    onClick={() => { onSave(post.id, post.isSaved); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Bookmark className={clsx("w-4 h-4", post.isSaved && "fill-current text-primary-600")} />
                    {post.isSaved ? 'Remover dos Salvos' : 'Salvar Publicação'}
                  </button>
                )}

                {post.user_id !== session.user.id && onUnfollow && (
                  <button
                    onClick={() => { onUnfollow(post.user_id); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <UserMinus className="w-4 h-4" /> Deixar de Seguir
                  </button>
                )}

                <button
                  onClick={handleNativeShare}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Compartilhar Externo
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); alert('Link copiado!'); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" /> Copiar Link
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        {isEditingPost ? (
          <div className="space-y-2">
            <textarea
              value={editPostText}
              onChange={(e) => setEditPostText(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none min-h-[80px]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEditPost}
                className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 rounded-full font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={submitEditPost}
                disabled={!editPostText.trim() || editPostText === post.content}
                className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 disabled:opacity-50 transition"
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-800 dark:text-gray-200 text-sm md:text-base whitespace-pre-wrap leading-relaxed">
            {post.is_repost ? post.original?.content : post.content}
          </p>
        )}

        {/* Se nao tem imagem mas tem link, mostra o preview do link */}
        {postImages.length === 0 && firstUrl && !isEditingPost && (
           <LinkPreview url={firstUrl} />
        )}
      </div>

      {postImages.length > 0 && (
        <div className="mb-4 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 group">
          <div
            className="cursor-pointer"
            onClick={() => onImageClick(postImages[currentImageIndex])}
          >
            <img
              src={postImages[currentImageIndex]}
              alt="Post attachment"
              className="w-full max-h-96 object-contain hover:scale-[1.02] transition-transform duration-300"
            />
          </div>

          {postImages.length > 1 && (
            <>
              {/* Botões do Carrossel */}
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Indicadores (Bolinhas) */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {postImages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-white dark:bg-gray-800' : 'w-1.5 bg-white dark:bg-gray-800/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2 mb-2 px-1">
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

      <div className="flex gap-1 pt-1">
        <button
          onClick={() => onLike(post.id, post.isLiked)}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 group',
            post.isLiked ? 'text-primary-600 bg-primary-50' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
        >
          <Heart className={clsx('w-5 h-5 transition-transform group-active:scale-75', post.isLiked && 'fill-current')} />
          <span>Curtir</span>
        </button>
        <button
          onClick={() => onCommentToggle(post.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comentar</span>
        </button>
        <button
          onClick={() => onRepost(post)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span>Compartilhar</span>
        </button>
      </div>

      {post.showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex gap-3">
            <img src={profile?.avatar_url} alt="Me" className="w-8 h-8 rounded-full object-cover" />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={post.newComment || ''}
                onChange={(e) => onCommentChange(post.id, e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && onCommentSubmit(post.id, post.newComment)}
              />
              <button
                onClick={() => onCommentSubmit(post.id, post.newComment)}
                disabled={!post.newComment?.trim()}
                className="text-primary-600 disabled:opacity-50 p-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 pl-11">
            {post.comments?.map(comment => {
              const isCommentLiked = comment.comment_likes?.some(l => l.user_id === session.user.id);
              const likesCount = comment.comment_likes?.length || 0;

              return (
                <div key={comment.id} className="flex gap-2">
                  <img src={comment.profiles?.avatar_url} alt="User" className="w-7 h-7 rounded-full object-cover mt-1" />
                  <div className="flex flex-col flex-1">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none px-3 py-2 text-sm relative group">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 dark:text-gray-100 block">{comment.profiles?.full_name}</span>
                        {comment.profiles?.badges?.map(badge => (
                          <Badge key={badge} type={badge} />
                        ))}
                      </div>

                      {editingCommentId === comment.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs"
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && submitEditComment()}
                            autoFocus
                          />
                          <button onClick={submitEditComment} className="text-green-600"><Check className="w-4 h-4"/></button>
                          <button onClick={cancelEditComment} className="text-red-500"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{comment.content}</span>
                      )}

                      {/* Comment Actions for Author */}
                      {comment.user_id === session.user.id && editingCommentId !== comment.id && (
                        <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-2 bg-gray-100 dark:bg-gray-700/90 px-1 rounded">
                          <button onClick={() => startEditComment(comment)} className="text-gray-400 hover:text-blue-500" title="Editar">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => onCommentDelete(post.id, comment.id)} className="text-gray-400 hover:text-red-500" title="Excluir">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <button
                        onClick={() => onCommentLike(post.id, comment.id, isCommentLiked)}
                        className={clsx("hover:underline", isCommentLiked && "text-primary-600 font-bold")}
                      >
                        Curtir
                      </button>
                      {likesCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-primary-600 fill-current" />
                          <span>{likesCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
