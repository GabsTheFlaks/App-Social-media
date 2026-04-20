import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

import Layout from './components/Layout';
import Feed from './components/Feed';
import Profile from './components/Profile';
import NetworkLayout from './components/NetworkLayout';
import Login from './components/Login';
import Notifications from './components/Notifications';
import Settings from './components/Settings';
import SinglePost from './components/SinglePost';
import ChatRoute from './components/ChatRoute';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca a sessão atual no carregamento
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças de auth (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Se não tem sessão ativa, força ir para o Login
  if (!session) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Com sessão, renderiza o App real
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout session={session} />}>
          <Route index element={<Feed session={session} />} />
          <Route path="network" element={<NetworkLayout session={session} />} />
          <Route path="notifications" element={<Notifications session={session} />} />
          <Route path="profile" element={<Profile session={session} />} />
          <Route path="profile/:id" element={<Profile session={session} />} />
          <Route path="settings" element={<Settings session={session} />} />
          <Route path="post/:id" element={<SinglePost session={session} />} />
          <Route path="chat/:id" element={<ChatRoute session={session} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
