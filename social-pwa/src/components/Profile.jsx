import { useState, useEffect } from 'react';
import { Mail, Briefcase, MapPin, Edit3, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Profile({ session }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Stats
  const [stats, setStats] = useState({ connections: 0, posts: 0 });

  // Edit form state
  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    location: '',
    bio: ''
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchProfileData = async () => {
    try {
      // Pega perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          role: profileData.role || '',
          location: profileData.location || '',
          bio: profileData.bio || ''
        });
      }

      // Conta posts
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      setStats(prev => ({ ...prev, posts: postsCount || 0 }));
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [session.user.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', session.user.id);

      if (error) throw error;
      setProfile({ ...profile, ...formData });
      setEditing(false);
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar perfil');
    }
  };

  const handleAvatarUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;

      setUploadingAvatar(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // Upload no Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pega URL Publica
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Atualiza o Perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      alert('Foto de perfil atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar foto', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) return <div className="text-center p-8">Carregando perfil...</div>;
  if (!profile) return <div className="text-center p-8">Perfil não encontrado.</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        {/* Cover Photo */}
        <div className="h-32 md:h-48 w-full bg-primary-100 relative">
          <button className="absolute top-2 right-2 bg-white/80 p-2 rounded-full hover:bg-white transition" title="Em breve">
            <Edit3 className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          <div className="relative flex justify-between items-end -mt-12 md:-mt-16 mb-4">
            <div className="relative">
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white object-cover ${uploadingAvatar ? 'opacity-50' : ''}`}
              />
              <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition shadow-md">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full font-medium text-sm transition-colors"
              >
                Editar Perfil
              </button>
            ) : (
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>

          {!editing ? (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
              <p className="text-gray-600 font-medium mb-2">{profile.role || 'Cargo não definido'}</p>

              <p className="text-gray-700 text-sm mb-4">
                {profile.bio || 'Nenhuma biografia fornecida.'}
              </p>

              <div className="flex flex-col gap-2 text-sm text-gray-500 mb-4">
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>{profile.role || 'Adicione seu cargo atual'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{session.user.email}</span>
                </div>
              </div>

              <div className="flex gap-4 border-t border-gray-100 pt-4">
                <div className="text-center">
                  <span className="block font-bold text-gray-900">{stats.posts}</span>
                  <span className="text-xs text-gray-500">Posts</span>
                </div>
              </div>
            </div>
          ) : (
            // Form de Edição
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cargo / Título</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                  placeholder="Ex: Desenvolvedor Front-end"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Localização</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                  placeholder="Ex: São Paulo, BR"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sobre / Biografia</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white font-medium py-2 rounded-lg">
                Salvar Alterações
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
