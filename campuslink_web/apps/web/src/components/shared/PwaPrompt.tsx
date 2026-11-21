import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { loadLocal, saveLocal } from '../../services/localStore';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaPrompt() {
  const [installed, setInstalled] = useState(() => isInstalled());
  const [dismissed, setDismissed] = useState(() => loadLocal('pwa-install-dismissed', false));
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [mobileInstructions, setMobileInstructions] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState<ServiceWorker | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setMobileInstructions(mobile);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    let registration: ServiceWorkerRegistration | undefined;
    let cancelled = false;
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').then(result => {
        if (cancelled) return;
        registration = result;
        if (result.waiting) setUpdateWaiting(result.waiting);
        result.addEventListener('updatefound', () => {
          const worker = result.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateWaiting(worker);
          });
        });
      }).catch(error => console.warn('CampusLink service worker registration failed', error));
    }
    const onControllerChange = () => {
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    const refreshUpdate = () => { void registration?.update(); };
    window.addEventListener('online', refreshUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', refreshUpdate);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useEffect(() => saveLocal('pwa-install-dismissed', dismissed), [dismissed]);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    if (choice.outcome === 'accepted') setDismissed(true);
  };

  if (updateWaiting) return <aside className="pwa-banner" role="status"><span><b>CampusLink update ready</b><small>Refresh to use the latest version.</small></span><button className="primary-btn small" onClick={() => updateWaiting.postMessage({ type: 'SKIP_WAITING' })}><RefreshCw size={15}/> Update</button><button className="pwa-close" aria-label="Dismiss update notice" onClick={() => setUpdateWaiting(null)}><X size={16}/></button></aside>;
  if (installed || dismissed || (!prompt && !mobileInstructions)) return null;

  return <aside className="pwa-banner" role="status"><span><b>Take CampusLink with you</b><small>{prompt ? 'Install the app for a focused, full-screen experience.' : 'Use your browser menu and choose “Install app” or “Add to Home Screen”.'}</small></span>{prompt && <button className="primary-btn small" onClick={() => void install()}><Download size={15}/> Install</button>}<button className="pwa-close" aria-label="Dismiss install suggestion" onClick={() => setDismissed(true)}><X size={16}/></button></aside>;
}
