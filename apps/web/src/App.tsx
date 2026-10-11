import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
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
} from 'lucide-react';
import { AppSidebar } from './components/shell/AppSidebar';
import { BrandIntro } from './components/brand/BrandIntro';
import { InstallAppButton } from './components/shell/InstallAppButton';
import { roleNavigation } from './data/navigation';
import { AuthPage, type AuthSession } from './features/auth/AuthPage';
import { exportAccountData, getExpertWorkspace, getInstitutionalDashboard, getPreferences, getProducerOverview, isApiConfigured, logoutAccount, requestAccountDeletion, savePreferences, type ExpertWorkspaceData, type InstitutionalDashboardData, type ProducerOverviewData } from './lib/api';
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
  const [contactRequestPending, setContactRequestPending] = useState(false);
  const [overlay, setOverlay] = useState<'search' | 'notifications' | 'profile' | 'help' | 'settings' | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
  useEffect(() => { if (workspaceRef.current) workspaceRef.current.scrollTop = 0; }, [activeKey]);
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
  const userInitials = authSession?.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('fr-FR')).join('') || 'AE';

  if (!authSession) return <><AuthPage onAuthenticated={completeAuth} /><AnimatePresence>{showBrandIntro && <BrandIntro onComplete={completeBrandIntro} />}</AnimatePresence></>;

  return (
    <div className="agri-app">
      <AnimatePresence>{showBrandIntro && <BrandIntro onComplete={completeBrandIntro} />}</AnimatePresence>
      <div className="agri-atmosphere agri-atmosphere-one" /><div className="agri-atmosphere agri-atmosphere-two" />
      <AppSidebar activeKey={activeKey} role={role} name={authSession.name} initials={userInitials} collapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} onNavigate={navigate} onCollapseToggle={() => setSidebarCollapsed((current) => !current)} onMobileClose={() => setMobileSidebarOpen(false)} onHelp={() => setOverlay('help')} onSettings={() => setOverlay('settings')} onLogout={logout} />
      <div ref={workspaceRef} className="agri-workspace">
        <TopBar activeKey={activeKey} role={role} language={language} voiceEnabled={voiceEnabled} darkMode={darkMode} initials={userInitials} mobileMenuOpen={mobileSidebarOpen} searchOpen={overlay === 'search'} notificationsOpen={overlay === 'notifications'} profileOpen={overlay === 'profile'} onMenuOpen={() => setMobileSidebarOpen(true)} onRoleChange={updateRole} onLanguageChange={(next) => { setLanguage(next); if (isApiConfigured) void savePreferences({ language: next, voiceEnabled, darkMode }); }} onVoiceToggle={() => setVoiceEnabled((current) => { const next = !current; if (isApiConfigured) void savePreferences({ language, voiceEnabled: next, darkMode }); return next; })} onThemeToggle={() => setDarkMode((current) => { const next = !current; if (isApiConfigured) void savePreferences({ language, voiceEnabled, darkMode: next }); return next; })} onSearch={() => setOverlay('search')} onNotifications={() => setOverlay(overlay === 'notifications' ? null : 'notifications')} onProfile={() => setOverlay(overlay === 'profile' ? null : 'profile')} />
        {overlay === 'search' && <CommandPalette onClose={() => setOverlay(null)} navigate={(key) => { navigate(key); setOverlay(null); }} />}
        {overlay === 'notifications' && <NotificationPanel onClose={() => setOverlay(null)} navigate={(key) => { navigate(key); setOverlay(null); }} />}
        {overlay === 'profile' && <ProfilePanel role={role} profile={authSession.profile} plan={authSession.plan} name={authSession.name} onClose={() => setOverlay(null)} onLogout={logout} onSettings={() => setOverlay('settings')} />}
        {overlay === 'settings' && <SettingsPanel language={language} voiceEnabled={voiceEnabled} darkMode={darkMode} onClose={() => setOverlay(null)} onLanguageChange={(next) => { setLanguage(next); if (isApiConfigured) void savePreferences({ language: next, voiceEnabled, darkMode }); }} onVoiceToggle={() => setVoiceEnabled((current) => { const next = !current; if (isApiConfigured) void savePreferences({ language, voiceEnabled: next, darkMode }); return next; })} onThemeToggle={() => setDarkMode((current) => { const next = !current; if (isApiConfigured) void savePreferences({ language, voiceEnabled, darkMode: next }); return next; })} />}
        {overlay === 'help' && <HelpPanel onClose={() => setOverlay(null)} navigate={(key) => { navigate(key); setOverlay(null); }} />}
        <main className="agri-main"><div className="agri-main-inner"><PageErrorBoundary key={activeKey}>
          {activeKey === 'overview' ? <Overview navigate={navigate} voiceEnabled={voiceEnabled} role={role} name={authSession.name} plan={authSession.plan} /> : activeKey === 'emergency' ? <LazyPage label="Ouverture du centre SOS…"><EmergencyPage role={role} onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'feed' ? <LazyPage label="Chargement du fil d’échanges…"><FeedPage role={role} onBack={() => navigate('overview')} onNavigate={navigate} openComposerRequest={contactRequestPending} onComposerRequestHandled={() => setContactRequestPending(false)} /></LazyPage> : activeKey === 'institutional' ? <LazyPage label="Chargement du cockpit institutionnel…"><InstitutionalDashboard onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'guides' ? <LazyPage label="Chargement des fiches techniques…"><ResourcesPage role={role} kind="guides" onBack={() => navigate('overview')} onNavigate={navigate} /></LazyPage> : activeKey === 'directory' ? <LazyPage label="Ouverture de l’annuaire…"><ResourcesPage role={role} kind="directory" onBack={() => navigate('overview')} onNavigate={navigate} onContactExpert={() => { setContactRequestPending(true); navigate('feed'); }} /></LazyPage> : activeKey === 'billing' ? <LazyPage label="Ouverture de la facturation…"><BillingPage onBack={() => navigate('overview')} /></LazyPage> : <Overview navigate={navigate} voiceEnabled={voiceEnabled} role={role} name={authSession.name} plan={authSession.plan} />}
        </PageErrorBoundary></div></main>
      </div>
    </div>
  );
}

function TopBar({ activeKey, role, language, voiceEnabled, darkMode, initials, mobileMenuOpen, searchOpen, notificationsOpen, profileOpen, onMenuOpen, onRoleChange, onLanguageChange, onVoiceToggle, onThemeToggle, onSearch, onNotifications, onProfile }: { activeKey: NavigationKey; role: UserRole; language: LanguageCode; voiceEnabled: boolean; darkMode: boolean; initials: string; mobileMenuOpen: boolean; searchOpen: boolean; notificationsOpen: boolean; profileOpen: boolean; onMenuOpen: () => void; onRoleChange: (role: UserRole) => void; onLanguageChange: (language: LanguageCode) => void; onVoiceToggle: () => void; onThemeToggle: () => void; onSearch: () => void; onNotifications: () => void; onProfile: () => void }) {
  const currentSection = roleNavigation[role].find((item) => item.key === activeKey)?.label ?? 'Vue d’ensemble';
  return <header className="agri-topbar"><div className="agri-topbar-left"><button type="button" className="agri-mobile-menu" onClick={onMenuOpen} aria-label="Ouvrir le menu" aria-expanded={mobileMenuOpen} aria-controls="agri-sidebar"><Menu className="h-5 w-5" /></button><nav className="agri-breadcrumb" aria-label="Fil d’Ariane"><span>AgriExpert</span><span className="agri-breadcrumb-slash" aria-hidden="true">/</span><strong aria-current="page">{currentSection}</strong></nav></div><div className="agri-topbar-actions"><button type="button" className="agri-command-button" aria-label="Ouvrir la recherche" aria-haspopup="dialog" aria-expanded={searchOpen} aria-controls={searchOpen ? 'agri-command-palette' : undefined} onClick={onSearch}><Search className="h-4 w-4" /><span>Rechercher</span><kbd><Command className="h-3 w-3" /> K</kbd></button><span className="agri-topbar-divider" /><InstallAppButton collapsed /><div className="agri-topbar-desktop-controls"><CompactSelect ariaLabel="Profil d’espace" value={role} onChange={(value) => onRoleChange(value as UserRole)} options={[["producer", "Producteur"], ["expert", "Expert"], ["institution", "Institution"]]} /><CompactSelect ariaLabel="Langue de l’interface" value={language} onChange={(value) => onLanguageChange(value as LanguageCode)} options={[["fr", "FR"], ["mo", "MO"]]} /><button type="button" className="agri-icon-button" onClick={onVoiceToggle} aria-label={voiceEnabled ? 'Désactiver la lecture vocale' : 'Activer la lecture vocale'} aria-pressed={voiceEnabled}>{voiceEnabled ? <Volume2 className="h-4 w-4" /> : <Mic2 className="h-4 w-4" />}</button><button type="button" className="agri-icon-button" onClick={onThemeToggle} aria-label={darkMode ? 'Activer le thème clair' : 'Activer le thème sombre'} aria-pressed={darkMode}>{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div><button type="button" className="agri-icon-button agri-notification-button" aria-label="Centre d’activité" aria-expanded={notificationsOpen} aria-controls={notificationsOpen ? 'agri-notifications-panel' : undefined} onClick={onNotifications}><Bell className="h-4 w-4" /></button><button type="button" className="agri-avatar-button" aria-label="Ouvrir le profil" aria-expanded={profileOpen} aria-controls={profileOpen ? 'agri-profile-panel' : undefined} onClick={onProfile}><span>{initials}</span><ChevronDown className="h-3.5 w-3.5" /></button></div></header>;
}

function CompactSelect({ ariaLabel, value, onChange, options }: { ariaLabel: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <div className="agri-compact-select"><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel}>{options.map(([option, label]) => <option key={option} value={option}>{label}</option>)}</select><ChevronDown className="h-3 w-3" /></div>;
}

function Overview({ navigate, voiceEnabled, role, name, plan }: { navigate: (key: NavigationKey) => void; voiceEnabled: boolean; role: UserRole; name: string; plan?: SubscriptionPlan }) {
  if (role === 'expert') return <ExpertOverview navigate={navigate} name={name} />;
  if (role === 'institution') return <InstitutionOverview navigate={navigate} name={name} />;
  return <ProducerOverview navigate={navigate} voiceEnabled={voiceEnabled} name={name} plan={plan} />;
}

function ProducerOverview({ navigate, voiceEnabled, name, plan }: { navigate: (key: NavigationKey) => void; voiceEnabled: boolean; name: string; plan?: SubscriptionPlan }) {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [dashboard, setDashboard] = useState<ProducerOverviewData | null>(null);
  const [loading, setLoading] = useState(isApiConfigured);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    let active = true;
    if (!isApiConfigured) { setLoading(false); return; }
    setLoading(true); setError('');
    void getProducerOverview(period).then((response) => { if (active) setDashboard(response.data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Votre activité est momentanément indisponible.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, retryKey]);
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return <div className="agri-overview">
    <motion.div className="agri-welcome-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
      <div><div className="agri-eyebrow"><span className="agri-eyebrow-dot" /> {today} <span className="agri-eyebrow-separator">·</span> Burkina Faso</div><h1 className="agri-display-title">Bonjour {name.split(' ')[0]} <span className="agri-wave">✦</span></h1><p className="agri-intro">Votre activité agricole, vos experts et les prochaines actions utiles — au même endroit.</p></div>
      <div className="agri-welcome-actions"><span className="agri-territory-pill"><MapPin className="h-3.5 w-3.5" /> Ouagadougou</span><button type="button" className="agri-primary-button" onClick={() => navigate('feed')}><Plus className="h-4 w-4" /> Nouvelle demande</button></div>
    </motion.div>
    <PlanBanner plan={plan} navigate={navigate} />
    <HeroAction navigate={navigate} voiceEnabled={voiceEnabled} />
    {error && <div className="agri-overview-data-error" role="alert"><AlertTriangle className="h-4 w-4" /><span>{error}</span><button type="button" onClick={() => setRetryKey((current) => current + 1)}>Réessayer</button></div>}
    <MetricStrip dashboard={dashboard} loading={loading} configured={isApiConfigured} />
    <div className="agri-section-heading"><div><span className="agri-section-kicker">Votre cockpit</span><h2>Les bons repères, au bon moment</h2></div><span className="agri-section-context"><CalendarDays className="h-3.5 w-3.5" /> {dashboard ? `Actualisé ${new Date(dashboard.lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : isApiConfigured ? 'Synchronisation en cours' : 'Données non connectées'}</span></div>
    <div className="agri-content-grid"><PulseCard dashboard={dashboard} loading={loading} period={period} onPeriodChange={setPeriod} /><TodayCard navigate={navigate} questions={dashboard?.latestQuestions ?? []} loading={loading} configured={isApiConfigured} /></div>
    <div className="agri-section-heading agri-section-heading-lower"><div><span className="agri-section-kicker">Accès terrain</span><h2>Vos outils essentiels</h2></div><span className="agri-live-label"><span /> Services AgriExpert</span></div>
    <ToolGrid navigate={navigate} />
  </div>;
}

function PlanBanner({ plan, navigate }: { plan?: SubscriptionPlan; navigate: (key: NavigationKey) => void }) {
  const pro = plan === 'pro';
  return <section className={pro ? 'agri-plan-banner agri-plan-banner-pro' : 'agri-plan-banner'}><span className="agri-plan-mark"><Sparkles className="h-4 w-4" /></span><div><strong>{pro ? 'AgriExpert PRO activé' : 'Passez à AgriExpert PRO'}</strong><small>{pro ? 'Diagnostics photo, mode hors-ligne et réponses avancées sont disponibles.' : 'Débloquez le diagnostic photo, la synchronisation hors-ligne et vos suivis avancés.'}</small></div>{!pro && <button type="button" onClick={() => navigate('billing')}>Découvrir PRO <ArrowRight className="h-3.5 w-3.5" /></button>}<span className="agri-plan-chip">{pro ? 'PRO' : 'FREE'}</span></section>;
}

function HeroAction({ navigate, voiceEnabled }: { navigate: (key: NavigationKey) => void; voiceEnabled: boolean }) {
  return <motion.section className="agri-hero-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}><div className="agri-hero-orbit agri-orbit-one" /><div className="agri-hero-orbit agri-orbit-two" /><div className="agri-hero-copy"><div className="agri-hero-badge"><Sparkles className="h-3.5 w-3.5" /> Votre assistant du territoire</div><h2>Une décision plus sûre commence par <em>la bonne expertise.</em></h2><p>Posez une question par écrit ou par la voix. Notre réseau de spécialistes vous accompagne, de la parcelle au troupeau.</p><div className="agri-hero-buttons"><button type="button" className="agri-hero-primary" onClick={() => navigate('feed')}><MessageCircle className="h-4 w-4" /> Demander un conseil <ArrowRight className="ml-1 h-4 w-4" /></button><button type="button" className="agri-hero-voice" onClick={() => navigate('feed')}><span className={voiceEnabled ? 'agri-voice-pulse' : 'agri-voice-pulse agri-voice-off'}><Mic2 className="h-4 w-4" /></span> Parler à un expert</button></div></div><div className="agri-hero-visual"><div className="agri-hero-sun" /><div className="agri-hero-field"><span /><span /><span /><span /><span /></div><div className="agri-hero-plant"><Leaf className="h-24 w-24" /></div><div className="agri-floating-chip agri-chip-top"><span className="agri-chip-icon"><ShieldCheck className="h-3.5 w-3.5" /></span><span><b>Expert vérifié</b><small>Selon disponibilités</small></span></div><div className="agri-floating-chip agri-chip-bottom"><span className="agri-chip-avatar"><UsersRound className="h-4 w-4" /></span><span><b>Réseau de proximité</b><small><i /> Conseils par filière</small></span></div></div></motion.section>;
}

function MetricStrip({ dashboard, loading, configured }: { dashboard: ProducerOverviewData | null; loading: boolean; configured: boolean }) {
  const metrics = [
    { icon: MessageCircle, label: 'Demandes envoyées', value: dashboard?.kpis.totalQuestions, color: 'green' },
    { icon: CheckCircle2, label: 'Avec une réponse', value: dashboard?.kpis.answeredQuestions, color: 'gold' },
    { icon: CalendarClock, label: 'En attente', value: dashboard?.kpis.openQuestions, color: 'blue' },
    { icon: Siren, label: 'SOS en cours', value: dashboard?.kpis.activeEmergencies, color: 'violet' },
  ];
  return <div className="agri-metric-strip">{metrics.map((metric, index) => { const Icon = metric.icon; return <motion.div key={metric.label} className="agri-metric-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.35 }}><div className={`agri-metric-icon agri-metric-${metric.color}`}><Icon className="h-4.5 w-4.5" /></div><div className="agri-metric-copy"><span>{metric.label}</span><strong>{loading ? '—' : configured ? metric.value ?? 0 : '—'}</strong><small>{loading ? 'Mise à jour…' : configured ? 'votre compte' : 'connexion aux données requise'}</small></div></motion.div>; })}</div>;
}

function PulseCard({ dashboard, loading, period, onPeriodChange }: { dashboard: ProducerOverviewData | null; loading: boolean; period: '7d' | '30d'; onPeriodChange: (period: '7d' | '30d') => void }) {
  const slots = period === '7d' ? 7 : 10;
  const grouped = Array.from({ length: slots }, () => ({ requests: 0, label: '' }));
  const spanDays = period === '7d' ? 1 : 3;
  const dates = Array.from({ length: period === '7d' ? 7 : 30 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((period === '7d' ? 6 : 29) - index)); return date;
  });
  dates.forEach((date, index) => { grouped[Math.floor(index / spanDays)].label = period === '7d' ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date) : new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(date); });
  (dashboard?.trend ?? []).forEach((item) => {
    const date = new Date(`${item.day}T00:00:00`);
    const age = Math.round((new Date().setHours(0, 0, 0, 0) - date.getTime()) / 86_400_000);
    const index = period === '7d' ? 6 - age : Math.floor((29 - age) / spanDays);
    if (index >= 0 && index < grouped.length) grouped[index].requests += item.requests;
  });
  const values = grouped.map((item) => item.requests);
  const maxValue = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const bars = values.map((value) => value ? Math.max(8, (value / maxValue) * 100) : 3);
  return <motion.section className="agri-panel agri-pulse-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
    <div className="agri-panel-head"><div><span className="agri-panel-kicker"><Activity className="h-3.5 w-3.5" /> Votre activité</span><h3>Demandes envoyées</h3></div><div className="agri-period-switch" role="group" aria-label="Période du graphique"><button type="button" aria-pressed={period === '7d'} className={period === '7d' ? 'agri-period-active' : ''} onClick={() => onPeriodChange('7d')}>7 jours</button><button type="button" aria-pressed={period === '30d'} className={period === '30d' ? 'agri-period-active' : ''} onClick={() => onPeriodChange('30d')}>30 jours</button></div></div>
    <div className="agri-pulse-stats"><div><strong>{loading || !dashboard ? '—' : total}</strong><span>demandes</span></div><div className="agri-pulse-change"><CheckCircle2 className="h-3.5 w-3.5" /> {loading || !dashboard ? 'Données en attente' : `${dashboard.kpis.answersReceived} réponse${dashboard.kpis.answersReceived > 1 ? 's' : ''} reçue${dashboard.kpis.answersReceived > 1 ? 's' : ''}`}</div><div className="agri-pulse-legend"><span className="agri-legend-dot" /> Publiées par vous</div></div>
    <div className={`agri-bars ${period === '30d' ? 'agri-bars-month' : ''}`} role="img" aria-label={`Demandes envoyées sur ${period === '7d' ? 'les 7 derniers jours' : 'les 30 derniers jours'}`}>{bars.map((height, index) => <motion.span key={`${period}-${index}`} initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: .42, delay: index * .018 }} className={index >= bars.length - 3 ? 'agri-bar-active' : ''} />)}</div><div className="agri-chart-labels">{grouped.map((item, index) => (period === '7d' || index % 2 === 0 || index === grouped.length - 1) && <span key={`${item.label}-${index}`}>{item.label}</span>)}</div>
  </motion.section>;
}

function TodayCard({ navigate, questions, loading, configured }: { navigate: (key: NavigationKey) => void; questions: ProducerOverviewData['latestQuestions']; loading: boolean; configured: boolean }) {
  const day = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date()).replace('.', '').toUpperCase();
  const statusLabel = (status: 'open' | 'answered' | 'closed') => status === 'open' ? 'En attente d’une réponse' : status === 'answered' ? 'Une réponse reçue' : 'Clôturée';
  return <motion.section className="agri-panel agri-today-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: .08 }}><div className="agri-panel-head"><div><span className="agri-panel-kicker"><Sparkles className="h-3.5 w-3.5" /> Votre suivi</span><h3>Dernières demandes</h3></div><span className="agri-date-badge">{day}</span></div><div className="agri-agenda">{loading ? <p className="agri-overview-empty" role="status">Chargement de vos demandes…</p> : questions.length ? questions.slice(0, 3).map((question) => <AgendaItem key={question.id} color={question.status === 'open' ? 'gold' : 'green'} time={new Date(question.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} title={question.title} detail={`${statusLabel(question.status)} · ${question.answer_count} réponse${question.answer_count > 1 ? 's' : ''}`} onClick={() => navigate('feed')} />) : <p className="agri-overview-empty">{configured ? 'Aucune demande pour le moment. Posez votre première question au réseau.' : 'Vos demandes apparaîtront ici lorsque les données du compte seront connectées.'}</p>}</div><button type="button" className="agri-outline-button" onClick={() => navigate(questions.length ? 'feed' : 'guides')}>{questions.length ? 'Ouvrir mes demandes' : 'Explorer les fiches techniques'} <ArrowRight className="h-3.5 w-3.5" /></button></motion.section>;
}

function AgendaItem({ color, time, title, detail, onClick }: { color: 'green' | 'gold' | 'blue'; time: string; title: string; detail: string; onClick: () => void }) {
  return <button type="button" className="agri-agenda-item" onClick={onClick}><span className={`agri-agenda-line agri-line-${color}`} /><time>{time}</time><span className="agri-agenda-copy"><strong>{title}</strong><span>{detail}</span></span><ArrowUpRight className="agri-agenda-check h-4 w-4" /></button>;
}

function ToolGrid({ navigate }: { navigate: (key: NavigationKey) => void }) {
  const tools = [{ key: 'feed' as NavigationKey, icon: MessageCircle, number: '01', title: 'Fil d’échanges', text: 'Conseils de terrain vérifiés par la communauté.', action: 'Explorer le fil', tone: 'green' }, { key: 'emergency' as NavigationKey, icon: Siren, number: '02', title: 'SOS Agropastoral', text: 'Signalez une urgence et suivez sa prise en charge.', action: 'Signaler maintenant', tone: 'red' }, { key: 'guides' as NavigationKey, icon: BookOpen, number: '03', title: 'Fiches techniques', text: 'Des itinéraires clairs pour chaque saison.', action: 'Voir les guides', tone: 'gold' }, { key: 'directory' as NavigationKey, icon: Compass, number: '04', title: 'Annuaire experts', text: 'Trouvez un spécialiste selon votre besoin.', action: 'Trouver un expert', tone: 'blue' }];
  return <div className="agri-tool-grid">{tools.map((tool, index) => { const Icon = tool.icon; return <motion.button key={tool.key} type="button" className={`agri-tool-card agri-tool-${tool.tone}`} onClick={() => navigate(tool.key)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }}><div className="agri-tool-top"><span className="agri-tool-number">{tool.number}</span><span className="agri-tool-icon"><Icon className="h-5 w-5" /></span></div><div><h3>{tool.title}</h3><p>{tool.text}</p></div><span className="agri-tool-action">{tool.action}<ArrowRight className="h-3.5 w-3.5" /></span></motion.button>; })}</div>;
}

function ExpertOverview({ navigate, name }: { navigate: (key: NavigationKey) => void; name: string }) {
  const firstName = name.split(' ')[0];
  const [workspace, setWorkspace] = useState<ExpertWorkspaceData | null>(null);
  const [loading, setLoading] = useState(isApiConfigured);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    let active = true;
    if (!isApiConfigured) { setLoading(false); return; }
    setLoading(true); setError('');
    void getExpertWorkspace().then((response) => { if (active) setWorkspace(response.data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Votre espace expert est momentanément indisponible.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);
  const stats = workspace?.stats;
  const earnings = workspace?.earnings;
  const averageResponse = stats?.averageResponseMinutes == null ? '—' : `${stats.averageResponseMinutes} min`;
  const money = (amount: number) => `${amount.toLocaleString('fr-FR')} F CFA`;
  const queue = workspace?.queue.slice(0, 3) ?? [];
  const availabilityLabel = loading ? 'Synchronisation…' : error ? 'Statut indisponible' : workspace ? workspace.availability.is_available ? 'Disponible pour répondre' : 'Indisponible' : 'Service non connecté';
  const categoryTone = (category: string) => category === 'livestock' ? 'gold' : category === 'aquaculture' ? 'blue' : category === 'apiculture' ? 'violet' : 'green';
  const dateLabel = (date: string) => new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return <div className="agri-role-overview agri-expert-overview"><motion.div className="agri-role-welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div><div className="agri-eyebrow"><span className="agri-eyebrow-dot" /> Espace expert · Activité du compte</div><h1 className="agri-display-title">Bonjour {firstName} <span className="agri-wave">✦</span></h1><p className="agri-intro">Les demandes qui comptent pour votre territoire, réunies au même endroit.</p></div><div className="agri-welcome-actions"><span className="agri-role-status"><i /> {availabilityLabel}</span><button type="button" className="agri-primary-button" onClick={() => navigate('feed')}><MessageSquareText className="h-4 w-4" /> Voir les demandes</button></div></motion.div>
    {error && <div className="agri-overview-data-error" role="alert"><AlertTriangle className="h-4 w-4" /><span>{error}</span><button type="button" onClick={() => setRetryKey((current) => current + 1)}>Réessayer</button></div>}
    <section className="agri-role-hero agri-role-hero-expert"><div><span className="agri-role-hero-kicker"><Stethoscope className="h-4 w-4" /> Votre impact terrain</span><h2>Chaque réponse<br /><em>fait avancer une parcelle.</em></h2><p>Retrouvez les producteurs en attente, priorisez les urgences et partagez votre expertise avec précision.</p><button type="button" className="agri-role-hero-button" onClick={() => navigate('feed')}>Traiter les demandes <ArrowRight className="h-4 w-4" /></button></div><div className="agri-role-hero-visual"><div className="agri-role-hero-ring" /><div className="agri-role-hero-stat"><strong>{loading ? '…' : averageResponse}</strong><span>{stats?.averageResponseMinutes == null ? 'délai moyen non disponible' : 'délai moyen mesuré'}</span></div><div className="agri-role-hero-orbit-chip"><CheckCircle2 className="h-4 w-4" /> {workspace ? workspace.availability.is_available ? 'Disponible dans le réseau' : 'Disponibilité désactivée' : 'Statut expert'}</div></div></section>
    <div className="agri-role-kpi-grid"><RoleKpi icon={ClipboardCheck} label="Demandes à traiter" value={loading ? '…' : stats ? String(stats.queued) : '—'} detail="File attribuée à votre compte" tone="green" /><RoleKpi icon={CalendarClock} label="Dossiers pris en charge" value={loading ? '…' : stats ? String(stats.assigned) : '—'} detail="Suivis actifs" tone="gold" /><RoleKpi icon={UsersRound} label="Réponses cette semaine" value={loading ? '…' : stats ? String(stats.responsesWeek) : '—'} detail="Réponses enregistrées" tone="blue" /><RoleKpi icon={TrendingUp} label="Rémunération en attente" value={loading ? '…' : earnings?.configured ? money(earnings.pendingXof) : 'Non configurée'} detail={earnings?.configured ? `${money(earnings.paidXof)} déjà réglés` : 'Aucun règlement disponible'} tone="violet" /></div>
    <div className="agri-role-content-grid"><RolePanel kicker="Dossiers attribués" title="Votre file d’expertise">{loading ? <p className="agri-overview-empty" role="status">Chargement de vos dossiers…</p> : queue.length ? queue.map((item) => <RoleQueueItem key={item.id} tone={categoryTone(item.category)} title={item.title} detail={`${item.producer_name} · ${item.category} · ${dateLabel(item.created_at)}`} onClick={() => navigate('feed')} />) : <div className="agri-overview-empty">{isApiConfigured ? 'Aucun dossier ne vous est attribué pour le moment.' : 'Connectez l’API pour afficher les dossiers de votre compte.'}</div>}</RolePanel><RolePanel kicker="Suivi professionnel" title="Votre activité récente"><RoleAgenda time={loading ? '…' : String(stats?.responsesWeek ?? '—')} title="Réponses cette semaine" detail="Conseils transmis depuis votre compte" /><RoleAgenda time={loading ? '…' : String(stats?.assigned ?? '—')} title="Dossiers en cours" detail="Demandes attribuées et suivies" /><RoleAgenda time={loading ? '…' : earnings?.configured ? money(earnings.pendingXof) : '—'} title="Solde en attente" detail={earnings?.configured ? `${money(earnings.paidXof)} déjà réglés` : 'Rémunération non configurée'} /></RolePanel></div>
  </div>;
}

function InstitutionOverview({ navigate, name }: { navigate: (key: NavigationKey) => void; name: string }) {
  const firstName = name.split(' ')[0];
  const [dashboard, setDashboard] = useState<InstitutionalDashboardData | null>(null);
  const [loading, setLoading] = useState(isApiConfigured);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    let active = true;
    if (!isApiConfigured) { setLoading(false); return; }
    setLoading(true); setError('');
    void getInstitutionalDashboard('7d', 'national').then((response) => { if (active) setDashboard(response.data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Les indicateurs institutionnels sont momentanément indisponibles.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);
  const kpis = dashboard?.kpis;
  const coverage = dashboard?.coverage;
  const alerts = dashboard?.alerts.slice(0, 3) ?? [];
  const resolution = kpis ? `${kpis.resolutionRate.toLocaleString('fr-FR')} %` : '—';
  const responseTime = kpis ? `${kpis.averageResponseMinutes} min` : '—';
  const status = loading ? 'Actualisation des données…' : error ? 'Indicateurs indisponibles' : dashboard ? `Mis à jour ${new Date(dashboard.lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Service non connecté';
  const alertTone = (level: 'critical' | 'high' | 'medium') => level === 'critical' ? 'red' : level === 'high' ? 'gold' : 'blue';
  return <div className="agri-role-overview agri-institution-overview"><motion.div className="agri-role-welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div><div className="agri-eyebrow"><span className="agri-eyebrow-dot" /> Espace institution · Vue agrégée</div><h1 className="agri-display-title">Bonjour {firstName} <span className="agri-wave">✦</span></h1><p className="agri-intro">Les signaux clés de votre périmètre pour coordonner l’action publique.</p></div><div className="agri-welcome-actions"><span className="agri-role-status"><i /> {status}</span><button type="button" className="agri-primary-button" onClick={() => navigate('institutional')}><Building2 className="h-4 w-4" /> Ouvrir le cockpit</button></div></motion.div>
    {error && <div className="agri-overview-data-error" role="alert"><AlertTriangle className="h-4 w-4" /><span>{error}</span><button type="button" onClick={() => setRetryKey((current) => current + 1)}>Réessayer</button></div>}
    <section className="agri-role-hero agri-role-hero-institution"><div><span className="agri-role-hero-kicker"><MapPinned className="h-4 w-4" /> Supervision territoriale</span><h2>Voir plus loin,<br /><em>agir au bon endroit.</em></h2><p>Suivez les demandes, les alertes agrégées et la capacité de réponse du réseau dans votre périmètre autorisé.</p><button type="button" className="agri-role-hero-button" onClick={() => navigate('institutional')}>Accéder au pilotage <ArrowRight className="h-4 w-4" /></button></div><div className="agri-role-hero-visual"><div className="agri-role-map-points"><i /><i /><i /><i /><i /></div><div className="agri-role-hero-stat"><strong>{loading ? '…' : resolution}</strong><span>taux de résolution</span></div><div className="agri-role-hero-orbit-chip"><Radio className="h-4 w-4" /> {dashboard ? 'Données agrégées' : 'Périmètre sécurisé'}</div></div></section>
    <div className="agri-role-kpi-grid"><RoleKpi icon={Target} label="Taux de résolution" value={loading ? '…' : resolution} detail="Sur la période sélectionnée" tone="green" /><RoleKpi icon={AlertTriangle} label="Alertes actives" value={loading ? '…' : kpis ? String(kpis.activeAlerts) : '—'} detail={kpis ? `${kpis.criticalAlerts} critiques` : 'Données non disponibles'} tone="red" /><RoleKpi icon={UsersRound} label="Experts disponibles" value={loading ? '…' : kpis ? String(kpis.availableExperts) : '—'} detail={kpis ? `sur ${kpis.totalExperts} référencés` : 'Données non disponibles'} tone="blue" /><RoleKpi icon={MapPinned} label="Demandes suivies" value={loading ? '…' : kpis ? String(kpis.totalRequests) : '—'} detail={kpis ? `${kpis.resolvedRequests} résolues · ${responseTime} en moyenne` : 'Données non disponibles'} tone="gold" /></div>
    <div className="agri-role-content-grid"><RolePanel kicker="Alertes agrégées" title="Signaux à coordonner">{loading ? <p className="agri-overview-empty" role="status">Chargement des alertes…</p> : alerts.length ? alerts.map((alert, index) => <RoleQueueItem key={`${alert.title}-${alert.region}-${index}`} tone={alertTone(alert.level)} title={alert.title} detail={`${alert.region} · ${alert.count} · ${alert.time}`} onClick={() => navigate('institutional')} />) : <div className="agri-overview-empty">{isApiConfigured ? 'Aucune alerte agrégée à afficher pour cette période.' : 'Connectez le service institutionnel pour charger les indicateurs autorisés.'}</div>}</RolePanel><RolePanel kicker="Capacité territoriale" title="Ressources mobilisables"><RoleAgenda time={loading ? '…' : String(coverage?.expertsMobilisable ?? '—')} title="Experts mobilisables" detail={coverage ? `${coverage.responseOperational} % de capacité opérationnelle` : 'Données non disponibles'} /><RoleAgenda time={loading ? '…' : String(coverage?.territoriesCovered ?? '—')} title="Territoires couverts" detail="Selon le périmètre institutionnel autorisé" /><RoleAgenda time={loading ? '…' : coverage?.laboratories == null ? '—' : String(coverage.laboratories)} title="Laboratoires référencés" detail="Capacité recensée dans le service" /></RolePanel></div>
  </div>;
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
  return <div className="agri-overlay-layer" role="dialog" aria-modal="true" aria-label="Recherche globale" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><motion.div id="agri-command-palette" className="agri-command-modal" initial={{ opacity: 0, y: -12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}><div className="agri-modal-search"><Search className="h-5 w-5" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Que cherchez-vous ?" /><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-command-list">{visible.map((item, index) => { const Icon = item.icon; return <button type="button" key={item.key} onClick={() => navigate(item.key)}><span className="agri-command-icon"><Icon className="h-4 w-4" /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><kbd>{index < 9 ? `0${index + 1}` : index + 1}</kbd></button>; })}{visible.length === 0 && <p className="agri-command-empty">Aucun parcours trouvé.</p>}</div><div className="agri-modal-footer"><span><Command className="h-3 w-3" /> K pour ouvrir</span><span>ESC pour fermer</span></div></motion.div></div>;
}

function NotificationPanel({ onClose, navigate }: { onClose: () => void; navigate: (key: NavigationKey) => void }) {
  const destinations: Array<{ key: NavigationKey; label: string; detail: string; icon: typeof MessageCircle }> = [
    { key: 'feed', label: 'Fil d’échanges', detail: 'Consulter les questions et réponses', icon: MessageCircle },
    { key: 'emergency', label: 'SOS Agropastoral', detail: 'Ouvrir le suivi des urgences', icon: Siren },
    { key: 'guides', label: 'Fiches techniques', detail: 'Retrouver vos repères de terrain', icon: BookOpen },
  ];
  return <div id="agri-notifications-panel" className="agri-floating-panel agri-notifications-panel"><div className="agri-floating-head"><div><strong>Centre d’activité</strong><small>Vos informations AgriExpert</small></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-notification-empty" role="status"><span><Bell className="h-5 w-5" /></span><strong>Pas de notification à afficher</strong><p>Les notifications personnelles ne sont pas encore activées. Consultez directement vos espaces pour voir les dernières mises à jour.</p></div><div className="agri-notification-shortcuts">{destinations.map(({ key, label, detail, icon: Icon }) => <button type="button" key={key} onClick={() => navigate(key)}><Icon className="h-4 w-4" /><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight className="ml-auto h-4 w-4" /></button>)}</div></div>;
}

function ProfilePanel({ role, profile, plan, name, onClose, onLogout, onSettings }: { role: UserRole; profile?: ProfileSpecialty; plan?: SubscriptionPlan; name: string; onClose: () => void; onLogout: () => void; onSettings: () => void }) {
  const roleLabel = role === 'producer' ? 'Producteur' : role === 'expert' ? 'Expert' : 'Institution';
  const profileLabel = profile?.replace('fish-farmer', 'Pisciculteur').replace('livestock', 'Éleveur').replace('beekeeper', 'Apiculteur').replace('farmer', 'Agriculteur').replace('agronomist', 'Agronome').replace('veterinarian', 'Vétérinaire').replace('aquaculture-specialist', 'Spécialiste pisciculture').replace('beekeeping-advisor', 'Apiculteur conseil');
  const planLabel = plan === 'pro' ? 'PRO' : plan === 'institution' ? 'Institution' : 'Free';
  return <div id="agri-profile-panel" className="agri-floating-panel agri-profile-panel"><div className="agri-floating-head"><div className="agri-profile-heading"><span>{name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><div><strong>{name}</strong><small>{roleLabel} · {profileLabel || 'Compte actif'}</small></div></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-profile-plan"><span>Formule active</span><strong>{planLabel}</strong><small>{plan === 'pro' ? 'Diagnostics photo · hors-ligne · outils avancés' : plan === 'institution' ? 'Pilotage agrégé et suivi territorial' : 'Accès essentiel au réseau'}</small></div><div className="agri-profile-menu"><button type="button" onClick={onSettings}><ShieldCheck className="h-4 w-4" /> Préférences du compte <ArrowRight className="ml-auto h-3.5 w-3.5" /></button><button type="button" onClick={onSettings}><Settings2 className="h-4 w-4" /> Réglages <ArrowRight className="ml-auto h-3.5 w-3.5" /></button><button type="button" className="agri-profile-logout" onClick={onLogout}><span>↗</span> Se déconnecter</button></div></div>;
}

function SettingsPanel({ language, voiceEnabled, darkMode, onClose, onLanguageChange, onVoiceToggle, onThemeToggle }: { language: LanguageCode; voiceEnabled: boolean; darkMode: boolean; onClose: () => void; onLanguageChange: (language: LanguageCode) => void; onVoiceToggle: () => void; onThemeToggle: () => void }) {
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [privacyBusy, setPrivacyBusy] = useState(false);
  async function downloadData() {
    setPrivacyBusy(true); setPrivacyMessage('');
    try {
      const result = await exportAccountData();
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `agriexpert-donnees-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
      setPrivacyMessage('Export JSON téléchargé. Les octets des photos et audios ne sont pas inclus ; seul leur index est fourni. Conservez ce fichier dans un endroit sûr.');
    } catch (error) { setPrivacyMessage(error instanceof Error ? error.message : 'Export indisponible.'); }
    finally { setPrivacyBusy(false); }
  }
  async function submitDeletionRequest() {
    if (!window.confirm('Envoyer une demande de suppression de compte ? Cette demande sera examinée ; elle ne supprime pas immédiatement vos données.')) return;
    setPrivacyBusy(true); setPrivacyMessage('');
    try { const result = await requestAccountDeletion(); setPrivacyMessage(result.message); }
    catch (error) { setPrivacyMessage(error instanceof Error ? error.message : 'Demande indisponible.'); }
    finally { setPrivacyBusy(false); }
  }
  return <div className="agri-overlay-layer agri-settings-overlay" role="dialog" aria-modal="true" aria-labelledby="agri-settings-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><motion.section className="agri-action-modal" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}><div className="agri-floating-head"><div><strong id="agri-settings-title">Réglages et préférences</strong><small>Personnalisez votre espace terrain</small></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-settings-list"><label><span><strong>Langue de l’interface</strong><small>Choisissez la langue de lecture et des repères</small></span><select value={language} onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}><option value="fr">Français</option><option value="mo">Mooré</option></select></label><button type="button" role="switch" aria-checked={voiceEnabled} onClick={onVoiceToggle}><span><strong>Assistance vocale</strong><small>Lecture des contenus compatibles</small></span><span className={voiceEnabled ? 'agri-settings-switch agri-settings-switch-on' : 'agri-settings-switch'} aria-hidden="true"><i /></span></button><button type="button" role="switch" aria-checked={darkMode} onClick={onThemeToggle}><span><strong>Thème sombre</strong><small>Réduire la luminosité de l’espace</small></span><span className={darkMode ? 'agri-settings-switch agri-settings-switch-on' : 'agri-settings-switch'} aria-hidden="true"><i /></span></button></div><div className="agri-privacy-actions"><h3>Vos données personnelles</h3><p>Exportez les informations liées à votre compte ou déposez une demande de suppression. Les délais et certaines obligations de conservation doivent encore être validés juridiquement au Burkina Faso.</p><button type="button" onClick={() => void downloadData()} disabled={privacyBusy}>Télécharger mes données (JSON)</button><button type="button" onClick={() => void submitDeletionRequest()} disabled={privacyBusy}>Demander la suppression du compte</button><div><a href="/privacy.html" target="_blank" rel="noreferrer">Projet de politique de confidentialité</a><a href="/terms.html" target="_blank" rel="noreferrer">Projet de conditions d’utilisation</a></div>{privacyMessage && <p role="status">{privacyMessage}</p>}</div><p className="agri-settings-note">Les préférences sont enregistrées sur votre compte lorsque la connexion au service est disponible.</p></motion.section></div>;
}

function HelpPanel({ onClose, navigate }: { onClose: () => void; navigate: (key: NavigationKey) => void }) {
  const destinations: Array<{ key: NavigationKey; title: string; detail: string; icon: typeof MessageCircle }> = [
    { key: 'feed', title: 'Poser une question', detail: 'Obtenir un conseil de la communauté', icon: MessageCircle },
    { key: 'emergency', title: 'Signaler une urgence', detail: 'Ouvrir le parcours SOS agropastoral', icon: Siren },
    { key: 'guides', title: 'Consulter les fiches', detail: 'Trouver un itinéraire ou un protocole', icon: BookOpen },
  ];
  return <div className="agri-overlay-layer agri-settings-overlay" role="dialog" aria-modal="true" aria-labelledby="agri-help-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><motion.section className="agri-action-modal" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}><div className="agri-floating-head"><div><strong id="agri-help-title">Centre d’aide AgriExpert</strong><small>Choisissez le bon parcours pour avancer</small></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-command-list">{destinations.map(({ key, title, detail, icon: Icon }) => <button type="button" key={key} onClick={() => navigate(key)}><span className="agri-command-icon"><Icon className="h-4 w-4" /></span><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight className="h-4 w-4" /></button>)}</div><div className="agri-help-foot"><strong>Besoin d’une aide humaine ?</strong><p>Pour une urgence sanitaire, contactez également les services vétérinaires ou phytosanitaires officiels de votre zone. AgriExpert ne remplace pas les services d’urgence.</p></div></motion.section></div>;
}

type PageErrorBoundaryState = { hasError: boolean };

class PageErrorBoundary extends Component<{ children: ReactNode }, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AgriExpert page rendering failed', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <section className="agri-page-error" role="alert"><span><AlertTriangle className="h-6 w-6" /></span><p className="agri-page-error-kicker">Un contretemps technique</p><h1>Cette page n’a pas pu s’ouvrir.</h1><p>Vos autres espaces restent accessibles. Réessayez maintenant ou revenez à votre tableau de bord.</p><div><button type="button" className="agri-page-error-primary" onClick={() => this.setState({ hasError: false })}>Réessayer</button><button type="button" onClick={() => window.location.reload()}>Recharger l’application</button></div></section>;
    }
    return this.props.children;
  }
}

function LazyPage({ label, children }: { label: string; children: ReactNode }) {
  return <Suspense fallback={<div className="agri-page-loading" role="status" aria-live="polite" aria-busy="true"><div className="agri-page-loading-skeleton" aria-hidden="true"><span /><div><i /><i /><i /></div><section><i /><i /><i /></section></div><span className="agri-page-loading-mark" aria-hidden="true"><Activity className="h-5 w-5" /></span><p>{label}</p></div>}>{children}</Suspense>;
}

export default App;
