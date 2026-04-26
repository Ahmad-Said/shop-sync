import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { useOfflineStore } from '../store/useOfflineStore';

export default function OfflineBanner() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const isSyncing = useOfflineStore((s) => s.isSyncing);
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    if (isOnline && !isSyncing && pendingCount === 0) {
      // Show a brief "back online" flash only after a sync completes
      setJustCameOnline(true);
      const t = setTimeout(() => setJustCameOnline(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, isSyncing, pendingCount]);

  if (!isOnline) {
    return (
      <div
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-display font-600"
        style={{ background: '#EF4444', color: '#fff' }}
      >
        <WifiOff size={13} />
        You're offline — changes will sync when reconnected
        {pendingCount > 0 && <span className="ml-1 opacity-80">· {pendingCount} pending</span>}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-display font-600"
        style={{ background: '#F59E0B', color: '#0C0C0F' }}
      >
        <RefreshCw size={13} className="animate-spin" />
        Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}…
      </div>
    );
  }

  if (justCameOnline) {
    return (
      <div
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-display font-600"
        style={{ background: '#00F5A0', color: '#0C0C0F' }}
      >
        <Wifi size={13} />
        Back online — all changes synced
      </div>
    );
  }

  return null;
}

