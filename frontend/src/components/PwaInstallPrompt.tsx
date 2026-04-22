import { useEffect, useMemo, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'pwa_install_prompt_dismissed';

function isStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  const isIosSafari = useMemo(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios/.test(ua);
    return isIos && isSafari;
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
      localStorage.setItem(DISMISS_KEY, '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (dismissed || isStandaloneMode()) return null;
  if (!deferredPrompt && !isIosSafari) return null;

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem(DISMISS_KEY, '1');
        setDismissed(true);
        setDeferredPrompt(null);
      }
      return;
    }

    toast('On iPhone: Share -> Add to Home Screen', { icon: '📱' });
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="glass rounded-2xl p-3.5 mb-6 flex items-center justify-between gap-3 page-enter" style={{ border: '1px solid rgba(0,245,160,0.2)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <Smartphone size={16} style={{ color: 'var(--neon)', flexShrink: 0 }} />
        <p className="text-xs sm:text-sm leading-snug" style={{ color: 'var(--muted)' }}>
          Install ShopSync for a faster, app-like mobile experience.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={dismiss}
          className="px-2.5 py-1.5 rounded-lg text-xs"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          Not now
        </button>
        <button onClick={install} className="btn-neon px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5">
          <Download size={12} />
          Install
        </button>
      </div>
    </div>
  );
}

