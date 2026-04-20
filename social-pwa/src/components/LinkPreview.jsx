import { useState, useEffect } from 'react';
import { ExternalLink, PlayCircle } from 'lucide-react';

export default function LinkPreview({ url }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;

    // Helper para extrair ID do YouTube e gerar um preview customizado sem precisar da API
    const getYouTubeId = (url) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };

    const ytId = getYouTubeId(url);
    if (ytId) {
      setData({
        title: 'YouTube Video',
        description: url,
        image: { url: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` },
        isYouTube: true,
      });
      setLoading(false);
      return;
    }

    // Fallback para outros sites usando a API
    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && json.data) {
          setData(json.data);
        }
      })
      .catch(err => console.error("Erro ao buscar link preview", err))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading || !data) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-3 border border-gray-200 rounded-xl overflow-hidden hover:bg-gray-50 transition-colors group relative"
    >
      {data.image?.url && (
        <div className="relative">
          <img
            src={data.image.url}
            alt={data.title}
            className="w-full h-48 object-cover border-b border-gray-200"
            onError={(e) => {
              // Se a imagem falhar (ex: maxresdefault não existe em alguns vídeos antigos), usa a default
              if (data.isYouTube && e.target.src.includes('maxresdefault')) {
                 e.target.src = `https://img.youtube.com/vi/${getYouTubeId(url)}/hqdefault.jpg`;
              } else {
                 e.target.style.display = 'none';
              }
            }}
          />
          {data.isYouTube && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <PlayCircle className="w-12 h-12 text-white opacity-90 shadow-sm" />
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">
          {data.title || url}
        </h4>
        {data.description && !data.isYouTube && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {data.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{new URL(url).hostname}</span>
        </div>
      </div>
    </a>
  );

  function getYouTubeId(url) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  }
}
