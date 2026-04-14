import { useState } from 'react';
import { Mail, Briefcase, MapPin, Edit3 } from 'lucide-react';

export default function Profile() {
  const [user] = useState({
    name: 'João Desenvolvedor',
    role: 'Full Stack Engineer na Tech Corp',
    location: 'São Paulo, Brasil',
    email: 'joao@example.com',
    about: 'Apaixonado por tecnologia, criando interfaces incríveis com React e Tailwind. Amante de Progressive Web Apps.',
    avatar: 'https://i.pravatar.cc/150?u=joao',
    cover: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1000&q=80',
    stats: {
      connections: 500,
      posts: 42
    }
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        {/* Cover Photo */}
        <div className="h-32 md:h-48 w-full bg-gray-200 relative">
          <img src={user.cover} alt="Capa" className="w-full h-full object-cover" />
          <button className="absolute top-2 right-2 bg-white/80 p-2 rounded-full hover:bg-white transition">
            <Edit3 className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          <div className="relative flex justify-between items-end -mt-12 md:-mt-16 mb-4">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white"
            />
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full font-medium text-sm transition-colors">
              Editar Perfil
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600 font-medium mb-2">{user.role}</p>

            <p className="text-gray-700 text-sm mb-4">
              {user.about}
            </p>

            <div className="flex flex-col gap-2 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{user.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>Trabalha em Tech Corp</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            </div>

            <div className="flex gap-4 border-t border-gray-100 pt-4">
              <div className="text-center">
                <span className="block font-bold text-gray-900">{user.stats.connections}+</span>
                <span className="text-xs text-gray-500">Conexões</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-gray-900">{user.stats.posts}</span>
                <span className="text-xs text-gray-500">Posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-bold text-lg text-gray-900 mb-4">Atividade Recente</h2>
        <div className="text-center py-8 text-gray-500">
          Nenhuma atividade recente para mostrar.
        </div>
      </div>
    </div>
  );
}
