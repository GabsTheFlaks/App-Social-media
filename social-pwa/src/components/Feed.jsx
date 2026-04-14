import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send } from 'lucide-react';
import clsx from 'clsx';

// Fake Data for initial render
const FAKE_POSTS = [
  {
    id: 1,
    author: 'Alice Silva',
    role: 'Engenheira de Software Sênior',
    avatar: 'https://i.pravatar.cc/150?u=alice',
    content: 'Acabei de lançar um novo Progressive Web App usando React e Tailwind! A experiência de usuário está incrível 🚀📱',
    likes: 42,
    comments: 5,
    timestamp: '2h',
    liked: false
  },
  {
    id: 2,
    author: 'Carlos Eduardo',
    role: 'Product Designer',
    avatar: 'https://i.pravatar.cc/150?u=carlos',
    content: 'Qual a sua opinião sobre o uso de Tailwind CSS em projetos grandes? Tenho visto muitos debates sobre isso recentemente.',
    likes: 12,
    comments: 8,
    timestamp: '5h',
    liked: true
  }
];

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setPosts(FAKE_POSTS);
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handlePost = (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    const post = {
      id: Date.now(),
      author: 'Você',
      role: 'Desenvolvedor(a)',
      avatar: 'https://i.pravatar.cc/150?u=you',
      content: newPost,
      likes: 0,
      comments: 0,
      timestamp: 'Agora',
      liked: false
    };

    setPosts([post, ...posts]);
    setNewPost('');
  };

  const toggleLike = (id) => {
    setPosts(posts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          liked: !p.liked,
          likes: p.liked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-4">
      {/* Create Post */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handlePost}>
          <div className="flex gap-3">
            <img src="https://i.pravatar.cc/150?u=you" alt="Seu Avatar" className="w-10 h-10 rounded-full" />
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Sobre o que você quer falar?"
              className="w-full resize-none border-none focus:ring-0 text-gray-700 bg-gray-50 rounded-lg p-3 min-h-[80px]"
            />
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <button type="button" className="text-gray-500 hover:text-primary-600 flex items-center gap-2 p-2 rounded-lg hover:bg-primary-50 transition-colors">
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Mídia</span>
            </button>
            <button
              type="submit"
              disabled={!newPost.trim()}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Publicar
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
        ) : (
          posts.map(post => (
            <article key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start gap-3 mb-3">
                <img src={post.avatar} alt={post.author} className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{post.author}</h3>
                  <p className="text-xs text-gray-500">{post.role}</p>
                  <span className="text-xs text-gray-400">{post.timestamp}</span>
                </div>
              </div>
              <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 px-1">
                <span>{post.likes} curtidas</span>
                <span>{post.comments} comentários</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={clsx(
                    "flex-1 flex justify-center items-center gap-2 py-2 rounded-lg transition-colors",
                    post.liked ? "text-primary-600 hover:bg-primary-50" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Heart className={clsx("w-5 h-5", post.liked && "fill-current")} />
                  <span className="font-medium text-sm">Curtir</span>
                </button>
                <button className="flex-1 flex justify-center items-center gap-2 py-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium text-sm">Comentar</span>
                </button>
                <button className="flex-1 flex justify-center items-center gap-2 py-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium text-sm">Compartilhar</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
