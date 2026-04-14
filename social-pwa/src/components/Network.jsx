import { useState } from 'react';
import { UserPlus, UserCheck, X } from 'lucide-react';

const SUGGESTIONS = [
  { id: 1, name: 'Ana Costa', role: 'UX Designer', avatar: 'https://i.pravatar.cc/150?u=ana', mutual: 12 },
  { id: 2, name: 'Pedro Santos', role: 'DevOps Engineer', avatar: 'https://i.pravatar.cc/150?u=pedro', mutual: 3 },
  { id: 3, name: 'Marcos Silva', role: 'Frontend Developer', avatar: 'https://i.pravatar.cc/150?u=marcos', mutual: 8 },
];

const REQUESTS = [
  { id: 101, name: 'Lucas Oliveira', role: 'Recruiter at Tech', avatar: 'https://i.pravatar.cc/150?u=lucas', time: '2d' },
];

export default function Network() {
  const [suggestions, setSuggestions] = useState(SUGGESTIONS);
  const [requests, setRequests] = useState(REQUESTS);
  const [connected, setConnected] = useState({});

  const handleConnect = (id) => {
    setConnected(prev => ({ ...prev, [id]: true }));
  };

  const handleAccept = (id) => {
    setRequests(requests.filter(req => req.id !== id));
  };

  const handleDecline = (id) => {
    setRequests(requests.filter(req => req.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Connection Requests */}
      {requests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-gray-900">Convites ({requests.length})</h2>
            <button className="text-primary-600 text-sm font-medium">Ver todos</button>
          </div>
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <img src={req.avatar} alt={req.name} className="w-12 h-12 rounded-full" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{req.name}</h3>
                    <p className="text-xs text-gray-500">{req.role}</p>
                    <p className="text-xs text-gray-400 mt-1">Há {req.time}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDecline(req.id)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleAccept(req.id)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors">
                    <UserCheck className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Connections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-bold text-lg text-gray-900 mb-4">Pessoas que você talvez conheça</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suggestions.map(user => (
            <div key={user.id} className="flex flex-col items-center p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
              <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full mb-3" />
              <h3 className="font-semibold text-gray-900 text-center">{user.name}</h3>
              <p className="text-xs text-gray-500 text-center mb-2 line-clamp-1">{user.role}</p>
              <p className="text-xs text-gray-400 mb-4">{user.mutual} conexões em comum</p>

              <button
                onClick={() => handleConnect(user.id)}
                disabled={connected[user.id]}
                className={`w-full py-2 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  connected[user.id]
                    ? 'bg-gray-100 text-gray-600 cursor-default'
                    : 'bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-50'
                }`}
              >
                {connected[user.id] ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Pendente
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Conectar
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
