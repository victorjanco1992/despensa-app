import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalada');
    }
    
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-blue-600 text-white p-4 rounded-lg shadow-2xl z-50 animate-bounce">
      <div className="flex items-center gap-3">
        <span className="text-3xl">📱</span>
        <div className="flex-1">
          <p className="font-bold">¡Instala la app!</p>
          <p className="text-sm opacity-90">Accede más rápido desde tu dispositivo</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition"
        >
          Instalar
        </button>
        <button
          onClick={() => setShowInstall(false)}
          className="text-white text-2xl hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
