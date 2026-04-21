import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Send, Trash2, Globe, Users, Repeat2, Edit2, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import LinkPreview from './LinkPreview';

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
  onEdit
}) {
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  const [isEditingPost, setIsEditingPost] = useState(false);
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all">
      {post.is_repost && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 pb-2 border-b border-gray-50">
          <Repeat2 className="w-4 h-4" />
          <span>{post.profiles?.full_name} compartilhou isso</span>
        </div>
      )}

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
        {post.user_id === session.user.id && !post.is_repost && !isEditingPost && (
          <div className="flex items-center gap-1">
            <button
              onClick={startEditPost}
              className="text-gray-400 hover:text-blue-500 p-1 transition"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="text-gray-400 hover:text-red-500 p-1 transition"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        {isEditingPost ? (
          <div className="space-y-2">
            <textarea
              value={editPostText}
              onChange={(e) => setEditPostText(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none min-h-[80px]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEditPost}
                className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-full font-medium transition"
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
          <p className="text-gray-800 text-sm md:text-base whitespace-pre-wrap leading-relaxed">
            {post.is_repost ? post.original?.content : post.content}
          </p>
        )}

        {/* Se nao tem imagem mas tem link, mostra o preview do link */}
        {!post.image_url && (!post.is_repost || !post.original?.image_url) && firstUrl && !isEditingPost && (
           <LinkPreview url={firstUrl} />
        )}
      </div>

      {(post.image_url || (post.is_repost && post.original?.image_url)) && (
        <div
          className="mb-4 rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
          onClick={() => onImageClick(post.is_repost ? post.original?.image_url : post.image_url)}
        >
          <img
            src={post.is_repost ? post.original?.image_url : post.image_url}
            alt="Post attachment"
            className="w-full max-h-96 object-contain hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      )}

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

      <div className="flex gap-1 pt-1">
        <button
          onClick={() => onLike(post.id, post.isLiked)}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 group',
            post.isLiked ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <Heart className={clsx('w-5 h-5 transition-transform group-active:scale-75', post.isLiked && 'fill-current')} />
          <span>Curtir</span>
        </button>
        <button
          onClick={() => onCommentToggle(post.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comentar</span>
        </button>
        <button
          onClick={() => onRepost(post)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span>Compartilhar</span>
        </button>
      </div>

      {post.showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          <div className="flex gap-3">
            <img src={profile?.avatar_url} alt="Me" className="w-8 h-8 rounded-full object-cover" />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={post.newComment || ''}
                onChange={(e) => onCommentChange(post.id, e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-primary-500"
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
                    <div className="bg-gray-100 rounded-2xl rounded-tl-none px-3 py-2 text-sm relative group">
                      <span className="font-bold text-gray-900 block">{comment.profiles?.full_name}</span>

                      {editingCommentId === comment.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && submitEditComment()}
                            autoFocus
                          />
                          <button onClick={submitEditComment} className="text-green-600"><Check className="w-4 h-4"/></button>
                          <button onClick={cancelEditComment} className="text-red-500"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <span className="text-gray-800">{comment.content}</span>
                      )}

                      {/* Comment Actions for Author */}
                      {comment.user_id === session.user.id && editingCommentId !== comment.id && (
                        <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-2 bg-gray-100/90 px-1 rounded">
                          <button onClick={() => startEditComment(comment)} className="text-gray-400 hover:text-blue-500" title="Editar">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => onCommentDelete(post.id, comment.id)} className="text-gray-400 hover:text-red-500" title="Excluir">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 ml-2 text-xs text-gray-500 font-medium">
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
