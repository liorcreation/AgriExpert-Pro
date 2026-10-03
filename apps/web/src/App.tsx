import { lazy, Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
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
import type { LanguageCode, NavigationKey, UserRole } from './types/shell';

const EmergencyPage = lazy(async () => ({ default: (await import('./features/emergencies/EmergencyPage')).EmergencyPage }));
const FeedPage = lazy(async () => ({ default: (await import('./features/feed/FeedPage')).FeedPage }));
const InstitutionalDashboard = lazy(async () => ({ default: (await import('./features/institutional/InstitutionalDashboard')).InstitutionalDashboard }));

function App() {
  const [activeKey, setActiveKey] = useState<NavigationKey>('overview');
  const [role, setRole] = useState<UserRole>('producer');
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
  const navigate = (key: NavigationKey) => { setActiveKey(key); setMobileSidebarOpen(false); };

  return (
    <div className="agri-app">
      <div className="agri-atmosphere agri-atmosphere-one" /><div className="agri-atmosphere agri-atmosphere-two" />
      <AppSidebar activeKey={activeKey} role={role} collapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} onNavigate={navigate} onCollapseToggle={() => setSidebarCollapsed((current) => !current)} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="agri-workspace">
        <TopBar role={role} language={language} voiceEnabled={voiceEnabled} darkMode={darkMode} onMenuOpen={() => setMobileSidebarOpen(true)} onRoleChange={setRole} onLanguageChange={setLanguage} onVoiceToggle={() => setVoiceEnabled((current) => !current)} onThemeToggle={() => setDarkMode((current) => !current)} />
        <main className="agri-main"><div className="agri-main-inner">
          {activeKey === 'overview' ? <Overview navigate={navigate} voiceEnabled={voiceEnabled} /> : activeKey === 'emergency' ? <LazyPage label="Ouverture du centre SOS…"><EmergencyPage onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'feed' ? <LazyPage label="Chargement du fil d’échanges…"><FeedPage onBack={() => navigate('overview')} /></LazyPage> : activeKey === 'institutional' ? <LazyPage label="Chargement du cockpit institutionnel…"><InstitutionalDashboard onBack={() => navigate('overview')} /></LazyPage> : <Overview navigate={navigate} voiceEnabled={voiceEnabled} />}
        </div></main>
      </div>
    </div>
  );
}

function TopBar({ role, language, voiceEnabled, darkMode, onMenuOpen, onRoleChange, onLanguageChange, onVoiceToggle, onThemeToggle }: { role: UserRole; language: LanguageCode; voiceEnabled: boolean; darkMode: boolean; onMenuOpen: () => void; onRoleChange: (role: UserRole) => void; onLanguageChange: (language: LanguageCode) => void; onVoiceToggle: () => void; onThemeToggle: () => void }) {
  return <header className="agri-topbar"><div className="agri-topbar-left"><button type="button" className="agri-mobile-menu" onClick={onMenuOpen} aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button><div className="agri-breadcrumb"><span>AgriExpert</span><span className="agri-breadcrumb-slash">/</span><strong>Centre de pilotage</strong></div></div><div className="agri-topbar-actions"><button type="button" className="agri-command-button" aria-label="Ouvrir la recherche"><Search className="h-4 w-4" /><span>Rechercher</span><kbd><Command className="h-3 w-3" /> K</kbd></button><span className="agri-topbar-divider" /><div className="agri-topbar-desktop-controls"><CompactSelect value={role} onChange={(value) => onRoleChange(value as UserRole)} options={[["producer", "Producteur"], ["expert", "Expert"], ["institution", "Institution"]]} /><CompactSelect value={language} onChange={(value) => onLanguageChange(value as LanguageCode)} options={[["fr", "FR"], ["mo", "MO"]]} /><button type="button" className="agri-icon-button" onClick={onVoiceToggle} aria-label="Basculer la voix">{voiceEnabled ? <Volume2 className="h-4 w-4" /> : <Mic2 className="h-4 w-4" />}</button><button type="button" className="agri-icon-button" onClick={onThemeToggle} aria-label="Changer de thème">{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div><button type="button" className="agri-icon-button agri-notification-button" aria-label="Notifications"><Bell className="h-4 w-4" /><span /></button><button type="button" className="agri-avatar-button" aria-label="Ouvrir le profil"><span>SD</span><ChevronDown className="h-3.5 w-3.5" /></button></div></header>;
}

function CompactSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return <div className="agri-compact-select"><select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Préférence">{options.map(([option, label]) => <option key={option} value={option}>{label}</option>)}</select><ChevronDown className="h-3 w-3" /></div>;
}

function Overview({ navigate, voiceEnabled }: { navigate: (key: NavigationKey) => void; voiceEnabled: boolean }) {
  return <div className="agri-overview"><div className="agri-welcome-row"><div><div className="agri-eyebrow"><span className="agri-eyebrow-dot" /> Mardi 03 octobre 2026 <span className="agri-eyebrow-separator">·</span> Burkina Faso</div><h1 className="agri-display-title">Bonjour Steve <span className="agri-wave">✦</span></h1><p className="agri-intro">Votre territoire agricole, vos experts et vos prochaines décisions — réunis au même endroit.</p></div><div className="agri-welcome-actions"><button type="button" className="agri-soft-action"><CloudSun className="h-4 w-4" /><span>28° · Ouaga</span></button><button type="button" className="agri-primary-button" onClick={() => navigate('feed')}><Plus className="h-4 w-4" /> Nouvelle demande</button></div></div><HeroAction navigate={navigate} voiceEnabled={voiceEnabled} /><MetricStrip /><div className="agri-section-heading"><div><span className="agri-section-kicker">Votre cockpit</span><h2>Ce qui mérite votre attention</h2></div><button type="button" className="agri-text-link" onClick={() => navigate('feed')}>Voir l’activité <ArrowRight className="h-4 w-4" /></button></div><div className="agri-content-grid"><PulseCard /><TodayCard navigate={navigate} /></div><div className="agri-section-heading agri-section-heading-lower"><div><span className="agri-section-kicker">Accès terrain</span><h2>Vos outils essentiels</h2></div><span className="agri-live-label"><span /> Tout est opérationnel</span></div><ToolGrid navigate={navigate} /></div>;
}

function HeroAction({ navigate, voiceEnabled }: { navigate: (key: NavigationKey) => void; voiceEnabled: boolean }) {
  return <motion.section className="agri-hero-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}><div className="agri-hero-orbit agri-orbit-one" /><div className="agri-hero-orbit agri-orbit-two" /><div className="agri-hero-copy"><div className="agri-hero-badge"><Sparkles className="h-3.5 w-3.5" /> Votre assistant du territoire</div><h2>Une décision plus sûre commence par <em>la bonne expertise.</em></h2><p>Posez une question par écrit ou par la voix. Notre réseau de spécialistes vous accompagne, de la parcelle au troupeau.</p><div className="agri-hero-buttons"><button type="button" className="agri-hero-primary" onClick={() => navigate('feed')}><MessageCircle className="h-4 w-4" /> Demander un conseil <ArrowRight className="ml-1 h-4 w-4" /></button><button type="button" className="agri-hero-voice" onClick={() => navigate('feed')}><span className={voiceEnabled ? 'agri-voice-pulse' : 'agri-voice-pulse agri-voice-off'}><Mic2 className="h-4 w-4" /></span> Parler à un expert</button></div></div><div className="agri-hero-visual"><div className="agri-hero-sun" /><div className="agri-hero-field"><span /><span /><span /><span /><span /></div><div className="agri-hero-plant"><Leaf className="h-24 w-24" /></div><div className="agri-floating-chip agri-chip-top"><span className="agri-chip-icon"><ShieldCheck className="h-3.5 w-3.5" /></span><span><b>Expert certifié</b><small>Réponse en 18 min</small></span></div><div className="agri-floating-chip agri-chip-bottom"><span className="agri-chip-avatar">AK</span><span><b>Awa Kaboré</b><small><i /> En ligne maintenant</small></span></div></div></motion.section>;
}

function MetricStrip() {
  const metrics = [{ icon: MessageCircle, label: 'Conseils reçus', value: '24', delta: '+18%', note: 'ce mois-ci', color: 'green' }, { icon: Zap, label: 'Temps de réponse', value: '18 min', delta: '-12%', note: 'vs. semaine passée', color: 'gold' }, { icon: UsersRound, label: 'Experts disponibles', value: '148', delta: 'En direct', note: 'dans votre zone', color: 'blue' }, { icon: ShieldCheck, label: 'Cas résolus', value: '92%', delta: '+4,8%', note: 'sur 30 jours', color: 'violet' }];
  return <div className="agri-metric-strip">{metrics.map((metric, index) => { const Icon = metric.icon; return <motion.div key={metric.label} className="agri-metric-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.35 }}><div className={`agri-metric-icon agri-metric-${metric.color}`}><Icon className="h-4.5 w-4.5" /></div><div className="agri-metric-copy"><span>{metric.label}</span><strong>{metric.value}</strong><small className={metric.delta === 'En direct' ? 'agri-metric-live' : ''}>{metric.delta} <em>{metric.note}</em></small></div><TrendingUp className="agri-metric-trend h-4 w-4" /></motion.div>; })}</div>;
}

function PulseCard() {
  const bars = [38, 52, 44, 70, 58, 80, 67, 93, 74, 86, 63, 78, 88, 68, 91, 76, 95, 82, 98, 84];
  return <section className="agri-panel agri-pulse-panel"><div className="agri-panel-head"><div><span className="agri-panel-kicker"><Activity className="h-3.5 w-3.5" /> Pulse du réseau</span><h3>Votre activité cette semaine</h3></div><button type="button" className="agri-more-button" aria-label="Plus d’options"><MoreHorizontal className="h-4 w-4" /></button></div><div className="agri-pulse-stats"><div><strong>128</strong><span>interactions</span></div><div className="agri-pulse-change"><TrendingUp className="h-3.5 w-3.5" /> +16,4%</div><div className="agri-pulse-legend"><span className="agri-legend-dot" /> Demandes traitées</div></div><div className="agri-bars" aria-label="Graphique des interactions de la semaine">{bars.map((height, index) => <span key={`${height}-${index}`} style={{ height: `${height}%` }} className={index > 15 ? 'agri-bar-active' : ''} />)}</div><div className="agri-chart-labels"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div></section>;
}

function TodayCard({ navigate }: { navigate: (key: NavigationKey) => void }) {
  return <section className="agri-panel agri-today-panel"><div className="agri-panel-head"><div><span className="agri-panel-kicker"><Sparkles className="h-3.5 w-3.5" /> À ne pas manquer</span><h3>Votre journée en un coup d’œil</h3></div><span className="agri-date-badge">03 OCT</span></div><div className="agri-agenda"><AgendaItem color="green" time="09:00" title="Réponse de l’ing. Awa Kaboré" detail="Feuilles de maïs jaunissantes" /><AgendaItem color="gold" time="11:30" title="Rappel d’itinéraire" detail="2e application · Parcelle Nord" /><AgendaItem color="blue" time="14:00" title="Disponibilité vétérinaire" detail="Dr. Adama Traoré · en ligne" /></div><button type="button" className="agri-outline-button" onClick={() => navigate('guides')}>Ouvrir mes itinéraires <ArrowRight className="h-3.5 w-3.5" /></button></section>;
}

function AgendaItem({ color, time, title, detail }: { color: 'green' | 'gold' | 'blue'; time: string; title: string; detail: string }) {
  return <div className="agri-agenda-item"><span className={`agri-agenda-line agri-line-${color}`} /><time>{time}</time><div><strong>{title}</strong><span>{detail}</span></div><Check className="agri-agenda-check h-4 w-4" /></div>;
}

function ToolGrid({ navigate }: { navigate: (key: NavigationKey) => void }) {
  const tools = [{ key: 'feed' as NavigationKey, icon: MessageCircle, number: '01', title: 'Fil d’échanges', text: 'Conseils de terrain vérifiés par la communauté.', action: 'Explorer le fil', tone: 'green' }, { key: 'emergency' as NavigationKey, icon: Siren, number: '02', title: 'SOS Agropastoral', text: 'Une urgence ? Mobilisez l’expert le plus proche.', action: 'Signaler maintenant', tone: 'red' }, { key: 'guides' as NavigationKey, icon: BookOpen, number: '03', title: 'Fiches techniques', text: 'Des itinéraires clairs pour chaque saison.', action: 'Voir les guides', tone: 'gold' }, { key: 'directory' as NavigationKey, icon: Compass, number: '04', title: 'Annuaire experts', text: '148 professionnels prêts à vous répondre.', action: 'Trouver un expert', tone: 'blue' }];
  return <div className="agri-tool-grid">{tools.map((tool, index) => { const Icon = tool.icon; return <motion.button key={tool.key} type="button" className={`agri-tool-card agri-tool-${tool.tone}`} onClick={() => navigate(tool.key)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }}><div className="agri-tool-top"><span className="agri-tool-number">{tool.number}</span><span className="agri-tool-icon"><Icon className="h-5 w-5" /></span></div><div><h3>{tool.title}</h3><p>{tool.text}</p></div><span className="agri-tool-action">{tool.action}<ArrowRight className="h-3.5 w-3.5" /></span></motion.button>; })}</div>;
}

function LazyPage({ label, children }: { label: string; children: React.ReactNode }) {
  return <Suspense fallback={<div className="agri-page-loading"><span><Activity className="h-5 w-5" /></span><p>{label}</p></div>}>{children}</Suspense>;
}

export default App;
