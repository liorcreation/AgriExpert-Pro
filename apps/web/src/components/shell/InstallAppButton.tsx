import { useEffect, useRef, useState } from 'react';
import { Download, Share } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function InstallAppButton({ collapsed }: { collapsed: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const installButtonRef = useRef<HTMLButtonElement>(null);
  const guideCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); setShowGuide(false); };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showGuide) return;
    guideCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowGuide(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      installButtonRef.current?.focus();
    };
  }, [showGuide]);

  async function install() {
    if (!installPrompt) { setShowGuide(true); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed) return null;

  return <>
      <button ref={installButtonRef} type="button" className="agri-install-app" onClick={install} title="Installer AgriExpert" aria-label="Installer AgriExpert" aria-haspopup="dialog">
      <Download className="h-4 w-4 shrink-0" />{!collapsed && <span>Installer l’application</span>}
    </button>
    {showGuide && <div className="agri-install-dialog-backdrop" onClick={() => setShowGuide(false)}>
      <section className="agri-install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" aria-describedby="install-description" onClick={(event) => event.stopPropagation()}>
        <h2 id="install-title">Emportez AgriExpert partout</h2>
        <p id="install-description">Ajoutez l’application à votre écran d’accueil pour la retrouver comme une app, en plein écran et avec un accès hors connexion aux pages déjà consultées.</p>
        {/iphone|ipad|ipod/i.test(navigator.userAgent)
          ? <p><Share className="mr-1 inline h-4 w-4 align-[-3px]" />Dans Safari, touchez <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</p>
          : <p>Dans le menu de votre navigateur, choisissez <strong>Installer AgriExpert</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</p>}
        <button ref={guideCloseRef} type="button" onClick={() => setShowGuide(false)}>Compris</button>
      </section>
    </div>}
  </>;
}
