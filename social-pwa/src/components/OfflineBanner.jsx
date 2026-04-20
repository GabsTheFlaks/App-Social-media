import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-red-500 text-white text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 fixed top-0 left-0 right-0 z-50">
      <WifiOff className="w-4 h-4" />
      <span>Você está offline. Algumas ações podem não funcionar.</span>
    </div>
  );
}
