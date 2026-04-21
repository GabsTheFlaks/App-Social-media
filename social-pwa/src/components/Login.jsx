import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu email para recuperar a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      toast.success('Se uma conta existir com esse email, você receberá um link de recuperação.');
      setIsForgotPassword(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        // Cadastro
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });

        if (signUpError) throw signUpError;

        // Em muitos casos o Supabase exige confirmação de email.
        // Se a sessão já vier, entra.
        if (data?.session) {
          navigate('/');
        } else {
          toast.success('Cadastro realizado! Verifique seu email para confirmar a conta (caso a confirmação esteja ativada no Supabase).');
        }
      } else {
        // Login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">SocialPWA</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isForgotPassword
              ? 'Recupere sua senha.'
              : isRegistering
                ? 'Crie sua conta na rede.'
                : 'Conecte-se com profissionais do mundo todo.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                }}
                className="text-primary-600 hover:underline text-sm font-medium"
              >
                Voltar para o Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome Completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="Seu nome"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>
        )}

        {!isForgotPassword && (
          <div className="mt-6 text-center flex flex-col space-y-3">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-primary-600 hover:underline text-sm font-medium"
            >
              {isRegistering
                ? 'Já tem uma conta? Faça login'
                : 'Não tem conta? Cadastre-se'}
            </button>

            {!isRegistering && (
              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 text-sm"
              >
                Esqueceu sua senha?
              </button>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 hidden">
           {/* Futura integração com OAuth (Google) */}
          <button className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-3">
            Continuar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
