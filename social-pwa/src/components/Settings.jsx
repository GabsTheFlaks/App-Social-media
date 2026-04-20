import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save, AlertTriangle, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const navigate = useNavigate();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!window.confirm('Deseja realmente alterar a sua senha?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      alert('Senha atualizada com sucesso!');
      setPassword('');
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      alert('Falha ao atualizar senha. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      'Isso apagará TODO o seu histórico (perfil, publicações, comentários, conexões).\nDigite "APAGAR" para confirmar a exclusão da sua conta:'
    );

    if (confirmation !== 'APAGAR') {
      alert('Exclusão cancelada.');
      return;
    }

    setLoadingDelete(true);
    try {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;

      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      alert('Não foi possível deletar a conta no momento. Certifique-se de que a função de banco de dados (delete_own_account) foi criada.');
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Configurações da Conta</h2>
        </div>

        <div className="p-6 space-y-8">

          {/* Alterar Senha */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-gray-800">
              <Key className="w-5 h-5" />
              <h3 className="font-bold text-md">Alterar Senha</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !password}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </section>

          <hr className="border-gray-100" />

          {/* Zona de Perigo */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-md">Zona de Perigo</h3>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100 max-w-md">
              <h4 className="font-bold text-red-800 mb-2">Excluir Conta</h4>
              <p className="text-sm text-red-700 mb-4 leading-relaxed">
                A exclusão da conta é permanente. Todos os seus dados serão apagados irreversivelmente.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={loadingDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium"
              >
                {loadingDelete ? 'Apagando conta...' : 'Excluir minha conta'}
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
