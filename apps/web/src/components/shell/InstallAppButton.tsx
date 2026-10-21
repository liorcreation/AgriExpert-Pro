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
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const installButtonRef = useRef<HTMLButtonElement>(null);
  const guideCloseRef = useRef<HTMLButtonElement>(null);
  const guideDialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
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
    const workspace = document.querySelector<HTMLElement>('.agri-workspace');
    const previousWorkspaceOverflow = workspace?.style.overflowY ?? '';
    const previousWorkspaceScrollTop = workspace?.scrollTop ?? 0;
    if (workspace) workspace.style.overflowY = 'hidden';
    guideCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowGuide(false); return; }
      if (event.key !== 'Tab') return;
      const dialog = guideDialogRef.current;
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0) : [];
      if (!focusable.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (workspace) {
        workspace.style.overflowY = previousWorkspaceOverflow;
        workspace.scrollTop = previousWorkspaceScrollTop;
      }
      installButtonRef.current?.focus();
    };
  }, [showGuide]);

  async function install() {
    setInstallError('');
    if (!installPrompt) { setShowGuide(true); return; }
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
    } catch {
      setInstallPrompt(null);
      setInstallError('L’installation automatique n’a pas abouti. Vous pouvez suivre les étapes manuelles ci-dessous.');
      setShowGuide(true);
    } finally {
      setInstalling(false);
    }
  }

  if (installed) return null;

  return <>
      <button ref={installButtonRef} type="button" className="agri-install-app" onClick={install} title="Installer AgriExpert" aria-label={installing ? 'Installation en cours' : 'Installer AgriExpert'} aria-haspopup="dialog" aria-expanded={showGuide} aria-controls={showGuide ? 'agri-install-guide' : undefined} disabled={installing}>
      <Download className="h-4 w-4 shrink-0" />{!collapsed && <span>{installing ? 'Installation…' : 'Installer l’application'}</span>}
    </button>
    {showGuide && <div className="agri-install-dialog-backdrop" onClick={() => setShowGuide(false)}>
      <section ref={guideDialogRef} id="agri-install-guide" className="agri-install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" aria-describedby="install-description" onClick={(event) => event.stopPropagation()}>
        <h2 id="install-title">Emportez AgriExpert partout</h2>
        {installError && <p role="alert">{installError}</p>}
        <p id="install-description">Ajoutez l’application à votre écran d’accueil pour la retrouver comme une app, en plein écran et avec un accès hors connexion aux pages déjà consultées.</p>
        {/iphone|ipad|ipod/i.test(navigator.userAgent)
          ? <p><Share className="mr-1 inline h-4 w-4 align-[-3px]" />Dans Safari, touchez <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</p>
          : <p>Dans le menu de votre navigateur, choisissez <strong>Installer AgriExpert</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</p>}
        <button ref={guideCloseRef} type="button" onClick={() => setShowGuide(false)}>Compris</button>
      </section>
    </div>}
  </>;
}
