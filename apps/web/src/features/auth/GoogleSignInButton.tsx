import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loginWithGoogle } from '../../lib/api';
import type { AuthSession } from './AuthPage';

type GoogleCredentialResponse = { credential: string };
type GoogleAccounts = {
  id: {
    initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void; auto_select?: boolean }) => void;
    renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
    cancel: () => void;
  };
};

declare global {
  interface Window { google?: { accounts: GoogleAccounts } }
}

const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';

export function GoogleSignInButton({ onAuthenticated, role, profile, plan }: { onAuthenticated: (session: AuthSession) => void; role: AuthSession['role']; profile?: AuthSession['profile']; plan?: AuthSession['plan'] }) {
  const buttonRoot = useRef<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>('.agri-auth-form-wrap'));
  }, []);

  useEffect(() => {
    if (!clientId || !target || !buttonRoot.current) return;
    let active = true;
    const render = () => {
      if (!active || !window.google || !buttonRoot.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setError('');
          try {
            const result = await loginWithGoogle(credential, { role, profile, plan });
            const user = result.data.user;
            onAuthenticated({ name: user.name, role: user.role, profile: user.profile as AuthSession['profile'], plan: user.plan });
          } catch (authError) {
            setError(authError instanceof Error ? authError.message : 'Connexion Google impossible.');
          }
        },
      });
      buttonRoot.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRoot.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', locale: 'fr', width: Math.min(380, target.clientWidth - 58) });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (window.google) render();
    else if (existing) existing.addEventListener('load', render, { once: true });
    else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.onload = render;
      script.onerror = () => setError('Le service Google ne se charge pas. Vérifiez votre connexion.');
      document.head.appendChild(script);
    }
    return () => { active = false; window.google?.accounts.id.cancel(); };
  }, [onAuthenticated, profile, plan, role, target]);

  if (!target) return null;
  return createPortal(<div className="agri-google-auth"><div className="agri-google-divider"><span />ou continuer avec<span /></div>{clientId ? <div ref={buttonRoot} className="agri-google-button" /> : <button type="button" className="agri-google-unconfigured" disabled aria-disabled="true">Continuer avec Google <small>Configuration OAuth à terminer</small></button>}{error && <p className="agri-auth-error" role="alert">{error}</p>}</div>, target);
}
