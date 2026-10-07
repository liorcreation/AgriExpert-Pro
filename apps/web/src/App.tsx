import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CloudSun,
  Command,
  Compass,
  ClipboardCheck,
  FileText,
  Leaf,
  MapPin,
  MapPinned,
  Menu,
  MessageCircle,
  MessageSquareText,
  Mic2,
  Moon,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  Siren,
  Stethoscope,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  UsersRound,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { AppSidebar } from './components/shell/AppSidebar';
import { BrandIntro } from './components/brand/BrandIntro';
import { InstallAppButton } from './components/shell/InstallAppButton';
import { AuthPage, type AuthSession } from './features/auth/AuthPage';
import { getPreferences, isApiConfigured, logoutAccount, savePreferences } from './lib/api';
import type { LanguageCode, NavigationKey, ProfileSpecialty, SubscriptionPlan, UserRole } from './types/shell';

const EmergencyPage = lazy(async () => ({ default: (await import('./features/emergencies/EmergencyPage')).EmergencyPage }));
const FeedPage = lazy(async () => ({ default: (await import('./features/feed/FeedPage')).FeedPage }));
const InstitutionalDashboard = lazy(async () => ({ default: (await import('./features/institutional/InstitutionalDashboard')).InstitutionalDashboard }));
const ResourcesPage = lazy(async () => ({ default: (await import('./features/resources/ResourcesPage')).ResourcesPage }));
const BillingPage = lazy(async () => ({ default: (await import('./features/billing/BillingPage')).BillingPage }));

function shouldShowBrandIntro() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem('agriexpert-brand-intro-seen') !== 'true';
  } catch {
    return true;
  }
}

function readAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  if (isApiConfigured) return null;
  try {
    const stored = window.localStorage.getItem('agriexpert-auth-session');
    return stored ? JSON.parse(stored) as AuthSession : null;
  } catch {
    return null;
  }
}

function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(readAuthSession);
  const [showBrandIntro, setShowBrandIntro] = useState(shouldShowBrandIntro);
  const [activeKey, setActiveKey] = useState<NavigationKey>('overview');
  const [role, setRole] = useState<UserRole>(() => readAuthSession()?.role ?? 'producer');
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [overlay, setOverlay] = useState<'search' | 'notifications' | 'profile' | null>(null);

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
  useEffect(() => {
    if (!authSession || !isApiConfigured) return;
    void getPreferences().then((response) => {
      setLanguage(response.data.language);
      setVoiceEnabled(Boolean(response.data.voice_enabled));
      setDarkMode(Boolean(response.data.dark_mode));
    }).catch(() => undefined);
  }, [authSession]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOverlay('search'); }
      if (event.key === 'Escape') setOverlay(null);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);
  const navigate = (key: NavigationKey) => { setActiveKey(key); setMobileSidebarOpen(false); };
  const completeBrandIntro = useCallback(() => {
    try { window.sessionStorage.setItem('agriexpert-brand-intro-seen', 'true'); } catch { /* Storage can be unavailable in private contexts. */ }
    setShowBrandIntro(false);
  }, []);
  const completeAuth = useCallback((session: AuthSession) => {
    if (isApiConfigured && session.guest) return;
    try { window.localStorage.setItem('agriexpert-auth-session', JSON.stringify(session)); } catch { /* Storage can be unavailable in private contexts. */ }
    setAuthSession(session);
    setRole(session.role);
  }, []);
  const updateRole = useCallback((nextRole: UserRole) => {
    setRole(nextRole);
    setActiveKey('overview');
    setMobileSidebarOpen(false);
    setAuthSession((current) => {
      if (!current) return current;
      const updated = { ...current, role: nextRole };
      try { window.localStorage.setItem('agriexpert-auth-session', JSON.stringify(updated)); } catch { /* Storage can be unavailable in private contexts. */ }
      return updated;
    });
  }, []);
  const logout = useCallback(() => {
    if (isApiConfigured) void logoutAccount().catch(() => undefined);
    try { window.localStorage.removeItem('agriexpert-auth-session'); } catch { /* Storage can be unavailable in private contexts. */ }
    setAuthSession(null);
    setOverlay(null);
  }, []);

  if (!authSession) return <><AuthPage onAuthenticated={completeAuth} /><AnimatePresence>{showBrandIntro && <BrandIntro onComplete={completeBrandIntro} />}</AnimatePresence></>;

  return (
    <div className="agri-app">
      <AnimatePresence>{showBrandIntro && <BrandIntro onComplete={completeBrandIntro} />}</AnimatePresence>
      <div className="agri-atmosphere agri-atmosphere-one" /><div className="agri-atmosphere agri-atmosphere-two" />
      <AppSidebar activeKey={activeKey} role={role} collapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} onNavigate={navigate} onCollapseToggle={() => setSidebarCollapsed((current) => !current)} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="agri-workspace">
        <TopBar role={role} language={language} voiceEnabled={voiceEnabled} darkMode={darkMode} onMenuOpen={() => setMobileSidebarOpen(true)} onRoleChange={updateRole} onLanguageChange={(next) => { setLanguage(next); if (isApiConfigured) void savePreferences({ language: next, voiceEnabled, darkMode }); }} onVoiceToggle={() => setVoiceEnabled((current) => { const next = !current; if (isApiConfigured) void savePreferences({ language, voiceEnabled: next, darkMode }); return next; })} onThemeToggle={() => setDarkMode((current) => { const next = !current; if (isApiConfigured) void savePreferences({ language, voiceEnabled, darkMode: next }); return next; })} onSearch={() => setOverlay('search')} onNotifications={() => setOverlay(overlay === 'notifications' ? null : 'notifications')} onProfile={() => setOverlay(overlay === 'profile' ? null : 'profile')} />
        {overlay === 'search' && <CommandPalette onClose={() => setOverlay(null)} navigate={(key) => { navigate(key); setOverlay(null); }} />}
        {overlay === 'notifications' && <NotificationPanel onClose={() => setOverlay(null)} />}
        {overlay === 'profile' && <ProfilePanel role={role} profile={authSession.profile} plan={authSession.plan} name={authSession.name} onClose={() => setOverlay(null)} onLogout={logout} />}
        <main className="agri-main"><div className="agri-main-inner">
          {activeKey === 'overview' ? <Overview navigate={navigate} voiceEnabled={voiceEnabled} role={role} name={authSession.name} plan={authSession.plan} /> : activeKey === 'emergency' ? <LazyPage label="Ouverture du centre SOS…"><EmergencyPage role={role} onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'feed' ? <LazyPage label="Chargement du fil d’échanges…"><FeedPage role={role} onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'institutional' ? <LazyPage label="Chargement du cockpit institutionnel…"><InstitutionalDashboard onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'guides' ? <LazyPage label="Chargement des fiches techniques…"><ResourcesPage role={role} kind="guides" onBack={() => navigate('overview')} onNavigate={navigate} /></LazyPage> : activeKey === 'directory' ? <LazyPage label="Ouverture de l’annuaire…"><ResourcesPage role={role} kind="directory" onBack={() => navigate('overview')} onNavigate={navigate} /></LazyPage> : activeKey === 'billing' ? <LazyPage label="Ouverture de la facturation…"><BillingPage onBack={() => navigate('overview')} /></LazyPage> : <Overview navigate={navigate} voiceEnabled={voiceEnabled} role={role} name={authSession.name} plan={authSession.plan} />}
        </div></main>
      </div>
    </div>
  );
}

function TopBar({ role, language, voiceEnabled, darkMode, onMenuOpen, onRoleChange, onLanguageChange, onVoiceToggle, onThemeToggle, onSearch, onNotifications, onProfile }: { role: UserRole; language: LanguageCode; voiceEnabled: boolean; darkMode: boolean; onMenuOpen: () => void; onRoleChange: (role: UserRole) => void; onLanguageChange: (language: LanguageCode) => void; onVoiceToggle: () => void; onThemeToggle: () => void; onSearch: () => void; onNotifications: () => void; onProfile: () => void }) {
  return <header className="agri-topbar"><div className="agri-topbar-left"><button type="button" className="agri-mobile-menu" onClick={onMenuOpen} aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button><div className="agri-breadcrumb"><span>AgriExpert</span><span className="agri-breadcrumb-slash">/</span><strong>Centre de pilotage</strong></div></div><div className="agri-topbar-actions"><button type="button" className="agri-command-button" aria-label="Ouvrir la recherche" onClick={onSearch}><Search className="h-4 w-4" /><span>Rechercher</span><kbd><Command className="h-3 w-3" /> K</kbd></button><span className="agri-topbar-divider" /><InstallAppButton collapsed /><div className="agri-topbar-desktop-controls"><CompactSelect value={role} onChange={(value) => onRoleChange(value as UserRole)} options={[["producer", "Producteur"], ["expert", "Expert"], ["institution", "Institution"]]} /><CompactSelect value={language} onChange={(value) => onLanguageChange(value as LanguageCode)} options={[["fr", "FR"], ["mo", "MO"]]} /><button type="button" className="agri-icon-button" onClick={onVoiceToggle} aria-label="Basculer la voix">{voiceEnabled ? <Volume2 className="h-4 w-4" /> : <Mic2 className="h-4 w-4" />}</button><button type="button" className="agri-icon-button" onClick={onThemeToggle} aria-label="Changer de thème">{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div><button type="button" className="agri-icon-button agri-notification-button" aria-label="Notifications" onClick={onNotifications}><Bell className="h-4 w-4" /><span /></button><button type="button" className="agri-avatar-button" aria-label="Ouvrir le profil" onClick={onProfile}><span>SD</span><ChevronDown className="h-3.5 w-3.5" /></button></div></header>;
}

function CompactSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return <div className="agri-compact-select"><select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Préférence">{options.map(([option, label]) => <option key={option} value={option}>{label}</option>)}</select><ChevronDown className="h-3 w-3" /></div>;
}

function Overview({ navigate, voiceEnabled, role, name, plan }: { navigate: (key: NavigationKey) => void; voiceEnabled: boolean; role: UserRole; name: string; plan?: SubscriptionPlan }) {
  if (role === 'expert') return <ExpertOverview navigate={navigate} name={name} />;
  if (role === 'institution') return <InstitutionOverview navigate={navigate} name={name} />;
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return <div className="agri-overview">
    <motion.div className="agri-welcome-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
      <div><div className="agri-eyebrow"><span className="agri-eyebrow-dot" /> {today} <span className="agri-eyebrow-separator">·</span> Burkina Faso</div><h1 className="agri-display-title">Bonjour {name.split(' ')[0]} <span className="agri-wave">✦</span></h1><p className="agri-intro">Votre activité agricole, vos experts et les prochaines actions utiles — au même endroit.</p></div>
      <div className="agri-welcome-actions"><span className="agri-territory-pill"><MapPin className="h-3.5 w-3.5" /> Ouagadougou</span><button type="button" className="agri-primary-button" onClick={() => navigate('feed')}><Plus className="h-4 w-4" /> Nouvelle demande</button></div>
    </motion.div>
    <PlanBanner plan={plan} navigate={navigate} />
    <HeroAction navigate={navigate} voiceEnabled={voiceEnabled} />
    <MetricStrip />
    <div className="agri-section-heading"><div><span className="agri-section-kicker">Votre cockpit</span><h2>Les bons repères, au bon moment</h2></div><span className="agri-section-context"><CalendarDays className="h-3.5 w-3.5" /> Mis à jour aujourd’hui</span></div>
    <div className="agri-content-grid"><PulseCard /><TodayCard navigate={navigate} /></div>
    <div className="agri-section-heading agri-section-heading-lower"><div><span className="agri-section-kicker">Accès terrain</span><h2>Vos outils essentiels</h2></div><span className="agri-live-label"><span /> Réseau disponible</span></div>
    <ToolGrid navigate={navigate} />
  </div>;
}

function PlanBanner({ plan, navigate }: { plan?: SubscriptionPlan; navigate: (key: NavigationKey) => void }) {
  const pro = plan === 'pro';
  return <section className={pro ? 'agri-plan-banner agri-plan-banner-pro' : 'agri-plan-banner'}><span className="agri-plan-mark"><Sparkles className="h-4 w-4" /></span><div><strong>{pro ? 'AgriExpert PRO activé' : 'Passez à AgriExpert PRO'}</strong><small>{pro ? 'Diagnostics photo, mode hors-ligne et réponses avancées sont disponibles.' : 'Débloquez le diagnostic photo, la synchronisation hors-ligne et vos suivis avancés.'}</small></div>{!pro && <button type="button" onClick={() => navigate('billing')}>Découvrir PRO <ArrowRight className="h-3.5 w-3.5" /></button>}<span className="agri-plan-chip">{pro ? 'PRO' : 'FREE'}</span></section>;
}

function HeroAction({ navigate, voiceEnabled }: { navigate: (key: NavigationKey) => void; voiceEnabled: boolean }) {
  return <motion.section className="agri-hero-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}><div className="agri-hero-orbit agri-orbit-one" /><div className="agri-hero-orbit agri-orbit-two" /><div className="agri-hero-copy"><div className="agri-hero-badge"><Sparkles className="h-3.5 w-3.5" /> Votre assistant du territoire</div><h2>Une décision plus sûre commence par <em>la bonne expertise.</em></h2><p>Posez une question par écrit ou par la voix. Notre réseau de spécialistes vous accompagne, de la parcelle au troupeau.</p><div className="agri-hero-buttons"><button type="button" className="agri-hero-primary" onClick={() => navigate('feed')}><MessageCircle className="h-4 w-4" /> Demander un conseil <ArrowRight className="ml-1 h-4 w-4" /></button><button type="button" className="agri-hero-voice" onClick={() => navigate('feed')}><span className={voiceEnabled ? 'agri-voice-pulse' : 'agri-voice-pulse agri-voice-off'}><Mic2 className="h-4 w-4" /></span> Parler à un expert</button></div></div><div className="agri-hero-visual"><div className="agri-hero-sun" /><div className="agri-hero-field"><span /><span /><span /><span /><span /></div><div className="agri-hero-plant"><Leaf className="h-24 w-24" /></div><div className="agri-floating-chip agri-chip-top"><span className="agri-chip-icon"><ShieldCheck className="h-3.5 w-3.5" /></span><span><b>Expert certifié</b><small>Réponse en 18 min</small></span></div><div className="agri-floating-chip agri-chip-bottom"><span className="agri-chip-avatar">AK</span><span><b>Awa Kaboré</b><small><i /> En ligne maintenant</small></span></div></div></motion.section>;
}

function MetricStrip() {
  const metrics = [{ icon: MessageCircle, label: 'Conseils reçus', value: '24', delta: '+18%', note: 'ce mois-ci', color: 'green' }, { icon: Zap, label: 'Temps de réponse', value: '18 min', delta: '-12%', note: 'vs. semaine passée', color: 'gold' }, { icon: UsersRound, label: 'Experts disponibles', value: '148', delta: 'En direct', note: 'dans votre zone', color: 'blue' }, { icon: ShieldCheck, label: 'Cas résolus', value: '92%', delta: '+4,8%', note: 'sur 30 jours', color: 'violet' }];
  return <div className="agri-metric-strip">{metrics.map((metric, index) => { const Icon = metric.icon; return <motion.div key={metric.label} className="agri-metric-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.35 }}><div className={`agri-metric-icon agri-metric-${metric.color}`}><Icon className="h-4.5 w-4.5" /></div><div className="agri-metric-copy"><span>{metric.label}</span><strong>{metric.value}</strong><small className={metric.delta === 'En direct' ? 'agri-metric-live' : ''}>{metric.delta} <em>{metric.note}</em></small></div><TrendingUp className="agri-metric-trend h-4 w-4" /></motion.div>; })}</div>;
}

function PulseCard() {
  const [period, setPeriod] = useState<'7j' | '30j'>('7j');
  const series = period === '7j'
    ? [38, 52, 44, 70, 58, 80, 67, 93, 74, 86, 63, 78, 88, 68, 91, 76, 95, 82, 98, 84]
    : [44, 38, 61, 53, 71, 48, 66, 57, 79, 63, 72, 59, 86, 69, 81, 74, 93, 68, 88, 78];
  const bars = period === '7j' ? series.slice(-7) : series;
  const labels = period === '7j' ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] : ['S−27', 'S−24', 'S−21', 'S−18', 'S−15', 'S−12', 'S−9', 'S−6', 'S−3', 'Auj.'];
  const total = period === '7j' ? '128' : '486';
  const change = period === '7j' ? '+16,4%' : '+12,8%';
  return <motion.section className="agri-panel agri-pulse-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
    <div className="agri-panel-head"><div><span className="agri-panel-kicker"><Activity className="h-3.5 w-3.5" /> Pulse du réseau</span><h3>Votre activité</h3></div><div className="agri-period-switch" role="group" aria-label="Période du graphique"><button type="button" aria-pressed={period === '7j'} className={period === '7j' ? 'agri-period-active' : ''} onClick={() => setPeriod('7j')}>7 jours</button><button type="button" aria-pressed={period === '30j'} className={period === '30j' ? 'agri-period-active' : ''} onClick={() => setPeriod('30j')}>30 jours</button></div></div>
    <div className="agri-pulse-stats"><div><strong>{total}</strong><span>interactions</span></div><div className="agri-pulse-change"><TrendingUp className="h-3.5 w-3.5" /> {change}</div><div className="agri-pulse-legend"><span className="agri-legend-dot" /> Demandes traitées</div></div>
    <div className={`agri-bars ${period === '30j' ? 'agri-bars-month' : ''}`} role="img" aria-label={`Interactions traitées sur ${period === '7j' ? 'les 7 derniers jours' : 'les 30 derniers jours'}`}>{bars.map((height, index) => <motion.span key={`${period}-${index}`} initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: .42, delay: index * .018 }} className={index >= bars.length - 3 ? 'agri-bar-active' : ''} />)}</div><div className="agri-chart-labels">{labels.map((label) => <span key={label}>{label}</span>)}</div>
  </motion.section>;
}

function TodayCard({ navigate }: { navigate: (key: NavigationKey) => void }) {
  const day = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date()).replace('.', '').toUpperCase();
  return <motion.section className="agri-panel agri-today-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: .08 }}><div className="agri-panel-head"><div><span className="agri-panel-kicker"><Sparkles className="h-3.5 w-3.5" /> À ne pas manquer</span><h3>Votre journée en un coup d’œil</h3></div><span className="agri-date-badge">{day}</span></div><div className="agri-agenda"><AgendaItem color="green" time="09:00" title="Réponse de l’ing. Awa Kaboré" detail="Feuilles de maïs jaunissantes" onClick={() => navigate('feed')} /><AgendaItem color="gold" time="11:30" title="Rappel d’itinéraire" detail="2e application · Parcelle Nord" onClick={() => navigate('guides')} /><AgendaItem color="blue" time="14:00" title="Disponibilité vétérinaire" detail="Dr. Adama Traoré · en ligne" onClick={() => navigate('directory')} /></div><button type="button" className="agri-outline-button" onClick={() => navigate('guides')}>Voir mes itinéraires <ArrowRight className="h-3.5 w-3.5" /></button></motion.section>;
}

function AgendaItem({ color, time, title, detail, onClick }: { color: 'green' | 'gold' | 'blue'; time: string; title: string; detail: string; onClick: () => void }) {
  return <button type="button" className="agri-agenda-item" onClick={onClick}><span className={`agri-agenda-line agri-line-${color}`} /><time>{time}</time><span className="agri-agenda-copy"><strong>{title}</strong><span>{detail}</span></span><ArrowUpRight className="agri-agenda-check h-4 w-4" /></button>;
}

function ToolGrid({ navigate }: { navigate: (key: NavigationKey) => void }) {
  const tools = [{ key: 'feed' as NavigationKey, icon: MessageCircle, number: '01', title: 'Fil d’échanges', text: 'Conseils de terrain vérifiés par la communauté.', action: 'Explorer le fil', tone: 'green' }, { key: 'emergency' as NavigationKey, icon: Siren, number: '02', title: 'SOS Agropastoral', text: 'Une urgence ? Mobilisez l’expert le plus proche.', action: 'Signaler maintenant', tone: 'red' }, { key: 'guides' as NavigationKey, icon: BookOpen, number: '03', title: 'Fiches techniques', text: 'Des itinéraires clairs pour chaque saison.', action: 'Voir les guides', tone: 'gold' }, { key: 'directory' as NavigationKey, icon: Compass, number: '04', title: 'Annuaire experts', text: '148 professionnels prêts à vous répondre.', action: 'Trouver un expert', tone: 'blue' }];
  return <div className="agri-tool-grid">{tools.map((tool, index) => { const Icon = tool.icon; return <motion.button key={tool.key} type="button" className={`agri-tool-card agri-tool-${tool.tone}`} onClick={() => navigate(tool.key)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }}><div className="agri-tool-top"><span className="agri-tool-number">{tool.number}</span><span className="agri-tool-icon"><Icon className="h-5 w-5" /></span></div><div><h3>{tool.title}</h3><p>{tool.text}</p></div><span className="agri-tool-action">{tool.action}<ArrowRight className="h-3.5 w-3.5" /></span></motion.button>; })}</div>;
}

function ExpertOverview({ navigate, name }: { navigate: (key: NavigationKey) => void; name: string }) {
  const firstName = name.split(' ')[0];
  return <div className="agri-role-overview agri-expert-overview"><motion.div className="agri-role-welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div><div className="agri-eyebrow"><span className="agri-eyebrow-dot" /> Espace expert · Réseau actif</div><h1 className="agri-display-title">Bonjour {firstName} <span className="agri-wave">✦</span></h1><p className="agri-intro">Les demandes qui comptent pour votre territoire, réunies au même endroit.</p></div><div className="agri-welcome-actions"><span className="agri-role-status"><i /> Disponible pour répondre</span><button type="button" className="agri-primary-button" onClick={() => navigate('feed')}><MessageSquareText className="h-4 w-4" /> Voir les demandes</button></div></motion.div><section className="agri-role-hero agri-role-hero-expert"><div><span className="agri-role-hero-kicker"><Stethoscope className="h-4 w-4" /> Votre impact terrain</span><h2>Chaque réponse<br /><em>fait avancer une parcelle.</em></h2><p>Retrouvez les producteurs en attente, priorisez les urgences et partagez votre expertise avec précision.</p><button type="button" className="agri-role-hero-button" onClick={() => navigate('feed')}>Traiter les demandes <ArrowRight className="h-4 w-4" /></button></div><div className="agri-role-hero-visual"><div className="agri-role-hero-ring" /><div className="agri-role-hero-stat"><strong>18 min</strong><span>votre délai moyen</span></div><div className="agri-role-hero-orbit-chip"><CheckCircle2 className="h-4 w-4" /> Certification active</div></div></section><div className="agri-role-kpi-grid"><RoleKpi icon={ClipboardCheck} label="Demandes à traiter" value="12" detail="4 prioritaires" tone="green" /><RoleKpi icon={CalendarClock} label="Rendez-vous aujourd’hui" value="6" detail="prochain à 09:30" tone="gold" /><RoleKpi icon={UsersRound} label="Producteurs accompagnés" value="126" detail="+18 ce mois-ci" tone="blue" /><RoleKpi icon={TrendingUp} label="Note du réseau" value="4,9/5" detail="sur vos 74 conseils" tone="violet" /></div><div className="agri-role-content-grid"><RolePanel kicker="À traiter maintenant" title="Votre file d’expertise"><RoleQueueItem tone="red" title="Feuilles de maïs jaunissantes" detail="Awa Traoré · Agriculture · il y a 9 min" onClick={() => navigate('feed')} /><RoleQueueItem tone="gold" title="Suspicion de maladie aviaire" detail="Moussa K. · Élevage · il y a 24 min" onClick={() => navigate('feed')} /><RoleQueueItem tone="blue" title="Qualité de l’eau du bassin" detail="Issa O. · Pisciculture · il y a 41 min" onClick={() => navigate('feed')} /></RolePanel><RolePanel kicker="Votre agenda" title="Les prochains rendez-vous"><RoleAgenda time="09:30" title="Appel avec Karim Sawadogo" detail="Suivi parcelle · Ouagadougou" /><RoleAgenda time="11:00" title="Visite d’exploitation" detail="Élevage · Koubri" /><RoleAgenda time="15:30" title="Permanence réseau" detail="Questions ouvertes · En ligne" /></RolePanel></div></div>;
}

function InstitutionOverview({ navigate, name }: { navigate: (key: NavigationKey) => void; name: string }) {
  const firstName = name.split(' ')[0];
  return <div className="agri-role-overview agri-institution-overview"><motion.div className="agri-role-welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div><div className="agri-eyebrow"><span className="agri-eyebrow-dot" /> Espace institution · Vue nationale</div><h1 className="agri-display-title">Bonjour {firstName} <span className="agri-wave">✦</span></h1><p className="agri-intro">Les signaux clés du territoire pour coordonner l’action publique.</p></div><div className="agri-welcome-actions"><span className="agri-role-status"><i /> Données actualisées</span><button type="button" className="agri-primary-button" onClick={() => navigate('institutional')}><Building2 className="h-4 w-4" /> Ouvrir le cockpit</button></div></motion.div><section className="agri-role-hero agri-role-hero-institution"><div><span className="agri-role-hero-kicker"><MapPinned className="h-4 w-4" /> Supervision nationale</span><h2>Voir plus loin,<br /><em>agir au bon endroit.</em></h2><p>Un cockpit unifié pour suivre les alertes, mesurer la capacité du réseau et orienter les ressources.</p><button type="button" className="agri-role-hero-button" onClick={() => navigate('institutional')}>Accéder au pilotage <ArrowRight className="h-4 w-4" /></button></div><div className="agri-role-hero-visual"><div className="agri-role-map-points"><i /><i /><i /><i /><i /></div><div className="agri-role-hero-stat"><strong>92,4%</strong><span>cas résolus</span></div><div className="agri-role-hero-orbit-chip"><Radio className="h-4 w-4" /> Réseau en direct</div></div></section><div className="agri-role-kpi-grid"><RoleKpi icon={Target} label="Taux de résolution" value="92,4 %" detail="+4,8 % ce mois" tone="green" /><RoleKpi icon={AlertTriangle} label="Alertes actives" value="67" detail="3 critiques" tone="red" /><RoleKpi icon={UsersRound} label="Experts mobilisables" value="148" detail="42 en ligne" tone="blue" /><RoleKpi icon={MapPinned} label="Territoires couverts" value="86 %" detail="12 régions suivies" tone="gold" /></div><div className="agri-role-content-grid"><RolePanel kicker="Priorités du jour" title="Alertes à coordonner"><RoleQueueItem tone="red" title="Foyer phytosanitaire détecté" detail="Boucle du Mouhoun · 26 signalements" onClick={() => navigate('institutional')} /><RoleQueueItem tone="gold" title="Suspicion de maladie animale" detail="Centre-Nord · 18 signalements" onClick={() => navigate('institutional')} /><RoleQueueItem tone="blue" title="Mortalité piscicole signalée" detail="Hauts-Bassins · 11 signalements" onClick={() => navigate('institutional')} /></RolePanel><RolePanel kicker="Réseau territorial" title="Capacité d’intervention"><RoleAgenda time="148" title="Experts référencés" detail="42 disponibles en ligne" /><RoleAgenda time="18 min" title="Temps moyen de réponse" detail="−12,6 % sur la période" /><RoleAgenda time="4,9/5" title="Confiance du réseau" detail="Note moyenne des producteurs" /></RolePanel></div></div>;
}

function RoleKpi({ icon: Icon, label, value, detail, tone }: { icon: typeof Activity; label: string; value: string; detail: string; tone: string }) { return <motion.div className={`agri-role-kpi agri-role-kpi-${tone}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><span><Icon className="h-5 w-5" /></span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></motion.div>; }
function RolePanel({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) { return <section className="agri-role-panel"><div className="agri-role-panel-head"><div><span>{kicker}</span><h2>{title}</h2></div><ArrowUpRight className="h-4 w-4" /></div><div className="agri-role-panel-list">{children}</div></section>; }
function RoleQueueItem({ tone, title, detail, onClick }: { tone: string; title: string; detail: string; onClick: () => void }) { return <button type="button" className="agri-role-queue-item" onClick={onClick}><i className={`agri-role-queue-${tone}`} /><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight className="h-4 w-4" /></button>; }
function RoleAgenda({ time, title, detail }: { time: string; title: string; detail: string }) { return <div className="agri-role-agenda"><time>{time}</time><span><strong>{title}</strong><small>{detail}</small></span><CheckCircle2 className="h-4 w-4" /></div>; }

function CommandPalette({ onClose, navigate }: { onClose: () => void; navigate: (key: NavigationKey) => void }) {
  const commands: Array<{ key: NavigationKey; label: string; detail: string; icon: typeof MessageCircle }> = [
    { key: 'feed', label: 'Fil d’échanges', detail: 'Poser une question ou consulter les réponses', icon: MessageCircle },
    { key: 'emergency', label: 'SOS Agropastoral', detail: 'Signaler une urgence prioritaire', icon: Siren },
    { key: 'guides', label: 'Fiches techniques', detail: 'Trouver un itinéraire de production', icon: BookOpen },
    { key: 'directory', label: 'Annuaire des experts', detail: 'Contacter un spécialiste proche', icon: Compass },
    { key: 'institutional', label: 'Pilotage institutionnel', detail: 'Ouvrir les indicateurs territoriaux', icon: Activity },
  ];
  const [query, setQuery] = useState('');
  const visible = commands.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="agri-overlay-layer" role="dialog" aria-modal="true" aria-label="Recherche globale" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><motion.div className="agri-command-modal" initial={{ opacity: 0, y: -12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}><div className="agri-modal-search"><Search className="h-5 w-5" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Que cherchez-vous ?" /><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-command-list">{visible.map((item, index) => { const Icon = item.icon; return <button type="button" key={item.key} onClick={() => navigate(item.key)}><span className="agri-command-icon"><Icon className="h-4 w-4" /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><kbd>{index < 9 ? `0${index + 1}` : index + 1}</kbd></button>; })}{visible.length === 0 && <p className="agri-command-empty">Aucun parcours trouvé.</p>}</div><div className="agri-modal-footer"><span><Command className="h-3 w-3" /> K pour ouvrir</span><span>ESC pour fermer</span></div></motion.div></div>;
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [read, setRead] = useState(false);
  return <div className="agri-floating-panel agri-notifications-panel"><div className="agri-floating-head"><div><strong>Notifications</strong><small>{read ? 'Tout est lu' : '3 nouvelles informations'}</small></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-notification-list"><NotificationItem tone="green" title="Réponse reçue" detail="Ing. Awa Kaboré a répondu à votre question." time="Il y a 9 min" /><NotificationItem tone="gold" title="Rappel d’itinéraire" detail="Votre seconde fertilisation est prévue demain." time="Il y a 1 h" /><NotificationItem tone="red" title="Réseau vétérinaire actif" detail="12 experts sont disponibles autour de Ouagadougou." time="Il y a 2 h" /></div><button type="button" className="agri-panel-link" onClick={() => setRead(true)}>{read ? 'Notifications archivées' : 'Marquer comme lu'} <Check className="h-3.5 w-3.5" /></button></div>;
}

function NotificationItem({ tone, title, detail, time }: { tone: 'green' | 'gold' | 'red'; title: string; detail: string; time: string }) {
  return <div className="agri-notification-item"><span className={`agri-notification-dot agri-notification-${tone}`} /><div><strong>{title}</strong><p>{detail}</p><small>{time}</small></div></div>;
}

function ProfilePanel({ role, profile, plan, name, onClose, onLogout }: { role: UserRole; profile?: ProfileSpecialty; plan?: SubscriptionPlan; name: string; onClose: () => void; onLogout: () => void }) {
  const roleLabel = role === 'producer' ? 'Producteur' : role === 'expert' ? 'Expert' : 'Institution';
  const profileLabel = profile?.replace('fish-farmer', 'Pisciculteur').replace('livestock', 'Éleveur').replace('beekeeper', 'Apiculteur').replace('farmer', 'Agriculteur').replace('agronomist', 'Agronome').replace('veterinarian', 'Vétérinaire').replace('aquaculture-specialist', 'Spécialiste pisciculture').replace('beekeeping-advisor', 'Apiculteur conseil');
  const planLabel = plan === 'pro' ? 'PRO' : plan === 'institution' ? 'Institution' : 'Free';
  return <div className="agri-floating-panel agri-profile-panel"><div className="agri-floating-head"><div className="agri-profile-heading"><span>SD</span><div><strong>{name}</strong><small>{roleLabel} · {profileLabel || 'Compte actif'}</small></div></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-profile-plan"><span>Formule active</span><strong>{planLabel}</strong><small>{plan === 'pro' ? 'Diagnostics photo · hors-ligne · outils avancés' : plan === 'institution' ? 'Pilotage agrégé et suivi territorial' : 'Accès essentiel au réseau'}</small></div><div className="agri-profile-menu"><button type="button"><ShieldCheck className="h-4 w-4" /> Mon espace sécurisé <ArrowRight className="ml-auto h-3.5 w-3.5" /></button><button type="button"><Settings2 className="h-4 w-4" /> Préférences <ArrowRight className="ml-auto h-3.5 w-3.5" /></button><button type="button" className="agri-profile-logout" onClick={onLogout}><span>↗</span> Se déconnecter</button></div></div>;
}

function LazyPage({ label, children }: { label: string; children: React.ReactNode }) {
  return <Suspense fallback={<div className="agri-page-loading"><span><Activity className="h-5 w-5" /></span><p>{label}</p></div>}>{children}</Suspense>;
}

export default App;
