import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CloudSun,
  Command,
  Compass,
  Leaf,
  MapPin,
  Menu,
  MessageCircle,
  Mic2,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Siren,
  Sparkles,
  Sun,
  TrendingUp,
  UsersRound,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { AppSidebar } from './components/shell/AppSidebar';
import { BrandIntro } from './components/brand/BrandIntro';
import { InstallAppButton } from './components/shell/InstallAppButton';
import type { LanguageCode, NavigationKey, UserRole } from './types/shell';

const EmergencyPage = lazy(async () => ({ default: (await import('./features/emergencies/EmergencyPage')).EmergencyPage }));
const FeedPage = lazy(async () => ({ default: (await import('./features/feed/FeedPage')).FeedPage }));
const InstitutionalDashboard = lazy(async () => ({ default: (await import('./features/institutional/InstitutionalDashboard')).InstitutionalDashboard }));
const ResourcesPage = lazy(async () => ({ default: (await import('./features/resources/ResourcesPage')).ResourcesPage }));

function shouldShowBrandIntro() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem('agriexpert-brand-intro-seen') !== 'true';
  } catch {
    return true;
  }
}

function App() {
  const [showBrandIntro, setShowBrandIntro] = useState(shouldShowBrandIntro);
  const [activeKey, setActiveKey] = useState<NavigationKey>('overview');
  const [role, setRole] = useState<UserRole>('producer');
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [overlay, setOverlay] = useState<'search' | 'notifications' | 'profile' | null>(null);

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
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

  return (
    <div className="agri-app">
      <AnimatePresence>{showBrandIntro && <BrandIntro onComplete={completeBrandIntro} />}</AnimatePresence>
      <div className="agri-atmosphere agri-atmosphere-one" /><div className="agri-atmosphere agri-atmosphere-two" />
      <AppSidebar activeKey={activeKey} role={role} collapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} onNavigate={navigate} onCollapseToggle={() => setSidebarCollapsed((current) => !current)} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="agri-workspace">
        <TopBar role={role} language={language} voiceEnabled={voiceEnabled} darkMode={darkMode} onMenuOpen={() => setMobileSidebarOpen(true)} onRoleChange={setRole} onLanguageChange={setLanguage} onVoiceToggle={() => setVoiceEnabled((current) => !current)} onThemeToggle={() => setDarkMode((current) => !current)} onSearch={() => setOverlay('search')} onNotifications={() => setOverlay(overlay === 'notifications' ? null : 'notifications')} onProfile={() => setOverlay(overlay === 'profile' ? null : 'profile')} />
        {overlay === 'search' && <CommandPalette onClose={() => setOverlay(null)} navigate={(key) => { navigate(key); setOverlay(null); }} />}
        {overlay === 'notifications' && <NotificationPanel onClose={() => setOverlay(null)} />}
        {overlay === 'profile' && <ProfilePanel role={role} onClose={() => setOverlay(null)} />}
        <main className="agri-main"><div className="agri-main-inner">
          {activeKey === 'overview' ? <Overview navigate={navigate} voiceEnabled={voiceEnabled} /> : activeKey === 'emergency' ? <LazyPage label="Ouverture du centre SOS…"><EmergencyPage onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'feed' ? <LazyPage label="Chargement du fil d’échanges…"><FeedPage onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'institutional' ? <LazyPage label="Chargement du cockpit institutionnel…"><InstitutionalDashboard onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'guides' ? <LazyPage label="Chargement des fiches techniques…"><ResourcesPage kind="guides" onBack={() => navigate('overview')} onNavigate={navigate} /></LazyPage> : activeKey === 'directory' ? <LazyPage label="Ouverture de l’annuaire…"><ResourcesPage kind="directory" onBack={() => navigate('overview')} onNavigate={navigate} /></LazyPage> : <Overview navigate={navigate} voiceEnabled={voiceEnabled} />}
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

function Overview({ navigate, voiceEnabled }: { navigate: (key: NavigationKey) => void; voiceEnabled: boolean }) {
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return <div className="agri-overview">
    <motion.div className="agri-welcome-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
      <div><div className="agri-eyebrow"><span className="agri-eyebrow-dot" /> {today} <span className="agri-eyebrow-separator">·</span> Burkina Faso</div><h1 className="agri-display-title">Bonjour Steve <span className="agri-wave">✦</span></h1><p className="agri-intro">Votre activité agricole, vos experts et les prochaines actions utiles — au même endroit.</p></div>
      <div className="agri-welcome-actions"><span className="agri-territory-pill"><MapPin className="h-3.5 w-3.5" /> Ouagadougou</span><button type="button" className="agri-primary-button" onClick={() => navigate('feed')}><Plus className="h-4 w-4" /> Nouvelle demande</button></div>
    </motion.div>
    <HeroAction navigate={navigate} voiceEnabled={voiceEnabled} />
    <MetricStrip />
    <div className="agri-section-heading"><div><span className="agri-section-kicker">Votre cockpit</span><h2>Les bons repères, au bon moment</h2></div><span className="agri-section-context"><CalendarDays className="h-3.5 w-3.5" /> Mis à jour aujourd’hui</span></div>
    <div className="agri-content-grid"><PulseCard /><TodayCard navigate={navigate} /></div>
    <div className="agri-section-heading agri-section-heading-lower"><div><span className="agri-section-kicker">Accès terrain</span><h2>Vos outils essentiels</h2></div><span className="agri-live-label"><span /> Réseau disponible</span></div>
    <ToolGrid navigate={navigate} />
  </div>;
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

function ProfilePanel({ role, onClose }: { role: UserRole; onClose: () => void }) {
  const roleLabel = role === 'producer' ? 'Producteur' : role === 'expert' ? 'Expert' : 'Institution';
  return <div className="agri-floating-panel agri-profile-panel"><div className="agri-floating-head"><div className="agri-profile-heading"><span>SD</span><div><strong>Steve D.</strong><small>{roleLabel} · Compte actif</small></div></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="agri-profile-menu"><button type="button"><ShieldCheck className="h-4 w-4" /> Mon espace sécurisé <ArrowRight className="ml-auto h-3.5 w-3.5" /></button><button type="button"><Settings2 className="h-4 w-4" /> Préférences <ArrowRight className="ml-auto h-3.5 w-3.5" /></button><button type="button" className="agri-profile-logout"><span>↗</span> Se déconnecter</button></div></div>;
}

function LazyPage({ label, children }: { label: string; children: React.ReactNode }) {
  return <Suspense fallback={<div className="agri-page-loading"><span><Activity className="h-5 w-5" /></span><p>{label}</p></div>}>{children}</Suspense>;
}

export default App;
