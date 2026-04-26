import { useEffect, useRef } from 'react';
import { useOfflineStore } from '../store/useOfflineStore';

/**
 * Keeps the offline store's `isOnline` flag in sync with the browser network status
 * and triggers queue processing when the connection is restored.
 *
 * Mount this once at the App level.
 */
export function useBackgroundSync() {
  const setOnline = useOfflineStore((s) => s.setOnline);
  const prevOnline = useRef(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      if (!prevOnline.current) {
        prevOnline.current = true;
        setOnline(true);
      }
    }
    function handleOffline() {
      prevOnline.current = false;
      setOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);
}

