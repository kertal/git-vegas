import { useState, useEffect } from 'react';

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // Check if we're in a PWA environment
    if ('serviceWorker' in navigator) {
      // Import the virtual module created by vite-plugin-pwa
      import('virtual:pwa-register')
        .then((module) => {
          const registerSW = module.registerSW;
          
          if (registerSW) {
            const updateServiceWorker = registerSW({
              onNeedRefresh() {
                console.log('PWA: New content available, click refresh to update');
                setNeedRefresh(true);
              },
              onOfflineReady() {
                console.log('PWA: App ready to work offline');
                setOfflineReady(true);
              },
              onRegistered(registration: ServiceWorkerRegistration | undefined) {
                console.log('PWA: Service Worker registered', registration);
              },
              onRegisterError(error: Error) {
                console.error('PWA: Service Worker registration failed', error);
              },
            });
            
            setUpdateSW(() => updateServiceWorker);
          }
        })
        .catch((error) => {
          // Virtual module might not be available in development or if PWA is disabled
          console.log('PWA: Virtual module not available', error.message);
        });
    }
  }, []);

  const handleUpdateServiceWorker = async (reloadPage = true) => {
    if (updateSW) {
      try {
        await updateSW(reloadPage);
        setNeedRefresh(false);
      } catch (error) {
        console.error('PWA: Failed to update service worker', error);
      }
    }
  };

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: handleUpdateServiceWorker,
  };
} 