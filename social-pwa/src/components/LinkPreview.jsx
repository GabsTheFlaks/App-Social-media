import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

export default function LinkPreview({ url }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;

    // Usando uma API gratuita de OpenGraph para gerar previews sem problemas de CORS.
    // Microlink é popular para isso.
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
      className="block mt-3 border border-gray-200 rounded-xl overflow-hidden hover:bg-gray-50 transition-colors group"
    >
      {data.image?.url && (
        <img
          src={data.image.url}
          alt={data.title}
          className="w-full h-48 object-cover border-b border-gray-200"
        />
      )}
      <div className="p-3">
        <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">
          {data.title || url}
        </h4>
        {data.description && (
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
}
