import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Check, Eye, EyeOff, Leaf, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { BrandLogo } from '../../components/brand/BrandLogo';
import type { UserRole } from '../../types/shell';

export type AuthSession = { name: string; role: UserRole; guest?: boolean };

type AuthMode = 'login' | 'register';
type AuthMethod = 'phone' | 'email';

const roles: Array<{ value: UserRole; label: string; description: string; icon: typeof Leaf }> = [
  { value: 'producer', label: 'Producteur', description: 'Je cultive, élève ou produis', icon: Leaf },
  { value: 'expert', label: 'Expert', description: 'J’accompagne les territoires', icon: BadgeCheck },
  { value: 'institution', label: 'Institution', description: 'Je pilote les filières', icon: UsersRound },
];

export function AuthPage({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [role, setRole] = useState<UserRole>('producer');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const IdentifierIcon = method === 'phone' ? Phone : Mail;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === 'register' && name.trim().length < 2) { setError('Indiquez votre nom pour personnaliser votre espace.'); return; }
    if (!identifier.trim()) { setError(method === 'phone' ? 'Indiquez votre numéro de téléphone.' : 'Indiquez votre adresse email.'); return; }
    if (password.length < 4) { setError('Votre mot de passe doit contenir au moins 4 caractères.'); return; }
    setError('');
    onAuthenticated({ name: name.trim() || 'Steve D.', role });
  };

  return <main className="agri-auth-shell"><div className="agri-auth-glow agri-auth-glow-one" /><div className="agri-auth-glow agri-auth-glow-two" /><div className="agri-auth-grid" />
    <section className="agri-auth-story"><div className="agri-auth-brand"><BrandLogo descriptor="CONSEIL · TERRITOIRES" /></div><div className="agri-auth-story-copy"><span className="agri-auth-overline"><Sparkles className="h-3.5 w-3.5" /> Le savoir qui germe</span><h1>Les bonnes décisions<br /><em>commencent ici.</em></h1><p>AgriExpert relie les réalités du terrain aux expertises qui font grandir chaque territoire.</p><div className="agri-auth-proof"><span><span className="agri-auth-proof-icon"><ShieldCheck className="h-4 w-4" /></span><span><strong>Réseau certifié</strong><small>148 spécialistes disponibles</small></span></span><span><span className="agri-auth-proof-icon agri-auth-proof-gold"><MapPin className="h-4 w-4" /></span><span><strong>Au plus près du terrain</strong><small>Dans toutes vos zones d’action</small></span></span></div></div><div className="agri-auth-story-footer"><span /> Burkina Faso · Plateforme agropastorale nationale</div></section>
    <section className="agri-auth-panel"><div className="agri-auth-panel-brand"><BrandLogo showName={false} size="compact" /><span>Votre espace sécurisé</span></div><div className="agri-auth-card"><div className="agri-auth-card-head"><span className="agri-auth-kicker">Bienvenue sur AgriExpert</span><h2>{mode === 'login' ? 'Retrouvons-nous sur le terrain.' : 'Créons votre espace terrain.'}</h2><p>{mode === 'login' ? 'Connectez-vous pour retrouver vos experts, vos alertes et vos itinéraires.' : 'Quelques informations suffisent pour commencer à avancer avec les bons repères.'}</p></div><div className="agri-auth-mode" role="tablist" aria-label="Type de parcours"><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'agri-auth-mode-active' : ''} onClick={() => { setMode('login'); setError(''); }}>Se connecter</button><button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'agri-auth-mode-active' : ''} onClick={() => { setMode('register'); setError(''); }}>Créer un compte</button></div><div className="agri-auth-form-wrap"><form className="agri-auth-form" onSubmit={submit}>{mode === 'register' && <label><span>Votre nom</span><div className="agri-auth-input"><UsersRound className="h-4 w-4" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Awa Kaboré" autoComplete="name" /></div></label>}<div className="agri-auth-field-heading"><span>{mode === 'register' ? 'Votre profil' : 'Se connecter avec'}</span>{mode === 'login' && <div className="agri-auth-methods"><button type="button" className={method === 'phone' ? 'agri-auth-method-active' : ''} onClick={() => { setMethod('phone'); setError(''); }}><Phone className="h-3.5 w-3.5" /> Téléphone</button><button type="button" className={method === 'email' ? 'agri-auth-method-active' : ''} onClick={() => { setMethod('email'); setError(''); }}><Mail className="h-3.5 w-3.5" /> Email</button></div>}</div>{mode === 'register' && <div className="agri-auth-role-grid">{roles.map(({ value, label, description, icon: Icon }) => <button type="button" key={value} className={role === value ? 'agri-auth-role agri-auth-role-active' : 'agri-auth-role'} onClick={() => setRole(value)}><span><Icon className="h-4 w-4" /></span><strong>{label}</strong><small>{description}</small>{role === value && <Check className="agri-auth-role-check h-3.5 w-3.5" />}</button>)}</div>}<label><span>{method === 'phone' ? 'Numéro de téléphone' : 'Adresse email'}</span><div className="agri-auth-input"><IdentifierIcon className="h-4 w-4" /><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} type={method === 'email' ? 'email' : 'tel'} placeholder={method === 'phone' ? '+226 70 00 00 00' : 'vous@agriexpert.bf'} autoComplete={method === 'email' ? 'email' : 'tel'} /></div></label><label><span>Mot de passe</span><div className="agri-auth-input"><LockKeyhole className="h-4 w-4" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>{error && <p className="agri-auth-error" role="alert">{error}</p>}<button type="submit" className="agri-auth-submit">{mode === 'login' ? 'Accéder à mon espace' : 'Créer mon espace'} <ArrowRight className="h-4 w-4" /></button></form></div>{mode === 'login' && <button type="button" className="agri-auth-forgot" onClick={() => setError('La récupération de compte sera disponible avec la connexion sécurisée.')}>Mot de passe oublié ?</button>}<div className="agri-auth-trust"><LockKeyhole className="h-3.5 w-3.5" /><span>Accès privé · vos données restent dans votre espace</span></div></div><button type="button" className="agri-auth-guest" onClick={() => onAuthenticated({ name: 'Visiteur', role: 'producer', guest: true })}>Découvrir AgriExpert sans compte <ArrowRight className="h-3.5 w-3.5" /></button></section>
  </main>;
}
