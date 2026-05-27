import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const hasDismissed = localStorage.getItem('installPromptDismissed');
    if (hasDismissed === 'true') {
      return;
    }

    // Android / Chrome detection
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Safari detection
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Check if it's already in standalone mode
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

    if (isIos() && !isInStandaloneMode()) {
      setShowIosPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const dismissPrompt = () => {
    setShowAndroidPrompt(false);
    setShowIosPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        dismissPrompt();
      }
      setDeferredPrompt(null);
      setShowAndroidPrompt(false);
    }
  };

  if (!showAndroidPrompt && !showIosPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-safe transition-opacity">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-xl relative">
        <button
          onClick={dismissPrompt}
          className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <img src="/icon-192x192.png" alt="App Icon" className="w-16 h-16 rounded-xl shadow-sm" />

          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Instalar App</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Adicione o SocialPWA à sua tela de início para uma experiência melhor, mais rápida e offline.
            </p>
          </div>

          {showAndroidPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Instalar Agora
            </button>
          )}

          {showIosPrompt && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 w-full flex flex-col items-center space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Para instalar no iOS:
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>1. Toque em</span>
                <Share className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>2. Selecione</span>
                <PlusSquare className="w-5 h-5" />
                <span className="font-medium">Adicionar à Tela de Início</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
