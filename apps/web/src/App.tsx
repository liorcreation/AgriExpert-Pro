import { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Clock3, MapPinned, MessageCircle, ShieldCheck, Siren, UsersRound, Volume2 } from 'lucide-react';
import { AppSidebar } from './components/shell/AppSidebar';
import { InstitutionalHeader } from './components/shell/InstitutionalHeader';
const EmergencyPage = lazy(async () => ({ default: (await import('./features/emergencies/EmergencyPage')).EmergencyPage }));
const FeedPage = lazy(async () => ({ default: (await import('./features/feed/FeedPage')).FeedPage }));
const InstitutionalDashboard = lazy(async () => ({ default: (await import('./features/institutional/InstitutionalDashboard')).InstitutionalDashboard }));
import type { LanguageCode, NavigationKey, UserRole } from './types/shell';

function App() {
  const [activeKey, setActiveKey] = useState<NavigationKey>('overview');
  const [role, setRole] = useState<UserRole>('producer');
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-obsidian-950">
      <InstitutionalHeader
        role={role}
        language={language}
        voiceEnabled={voiceEnabled}
        darkMode={darkMode}
        onMenuOpen={() => setMobileSidebarOpen(true)}
        onRoleChange={setRole}
        onLanguageChange={setLanguage}
        onVoiceToggle={() => setVoiceEnabled((current) => !current)}
        onThemeToggle={() => setDarkMode((current) => !current)}
      />

      <div className="flex min-h-[calc(100vh-76px)]">
        <AppSidebar
          activeKey={activeKey}
          role={role}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onNavigate={setActiveKey}
          onCollapseToggle={() => setSidebarCollapsed((current) => !current)}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1440px]">
            {activeKey === 'emergency' ? (
              <Suspense fallback={<PageLoading label="Ouverture du service SOS…" />}><EmergencyPage onBack={() => setActiveKey('overview')} /></Suspense>
            ) : activeKey === 'feed' ? (
              <Suspense fallback={<PageLoading label="Chargement du fil d’échanges…" />}><FeedPage onBack={() => setActiveKey('overview')} /></Suspense>
            ) : activeKey === 'institutional' ? (
              <Suspense fallback={<PageLoading label="Chargement des indicateurs…" />}><InstitutionalDashboard onBack={() => setActiveKey('overview')} /></Suspense>
            ) : (
              <>
                <OverviewHeader role={role} language={language} voiceEnabled={voiceEnabled} />
                <OverviewContent onNavigate={setActiveKey} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PageLoading({ label }: { label: string }) {
  return <div className="ag-card flex min-h-[420px] items-center justify-center p-8"><div className="text-center"><span className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-territory-500/10 text-territory-600 dark:text-territory-400"><Activity className="h-5 w-5" /></span><p className="mt-4 text-sm font-semibold text-obsidian-700 dark:text-cream-200">{label}</p></div></div>;
}

function OverviewHeader({ role, language, voiceEnabled }: { role: UserRole; language: LanguageCode; voiceEnabled: boolean }) {
  const roleName = role === 'producer' ? 'Producteur' : role === 'expert' ? 'Expert' : 'Institution';
  const languageName = language === 'fr' ? 'Français' : 'Mooré';

  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="ag-section-kicker">Mardi 20 septembre 2026 · Burkina Faso</p>
        <h1 className="mt-2 text-display-lg text-obsidian-950 dark:text-cream-50">Bonjour Steve,</h1>
        <p className="mt-2 max-w-2xl text-body-lg text-obsidian-600 dark:text-cream-300">Votre territoire agricole en un coup d’œil. Les experts et les services essentiels sont à portée de main.</p>
      </div>
      <div className="ag-glass flex w-fit items-center gap-3 rounded-card px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-territory-500/15 text-territory-700 dark:text-territory-300"><Volume2 className="h-5 w-5" /></span>
        <div>
          <p className="text-xs font-bold text-obsidian-800 dark:text-cream-100">Assistance vocale</p>
          <p className="text-[11px] text-obsidian-600 dark:text-cream-300">{voiceEnabled ? `${languageName} activé · ${roleName}` : 'Désactivée'}</p>
        </div>
        <span className={['ml-1 h-2.5 w-2.5 rounded-full', voiceEnabled ? 'bg-success-500 animate-pulse-soft' : 'bg-obsidian-300 dark:bg-obsidian-600'].join(' ')} />
      </div>
    </div>
  );
}

function OverviewContent({ onNavigate }: { onNavigate: (key: NavigationKey) => void }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs clés">
        <MetricCard icon={MessageCircle} label="Conseils reçus" value="24" detail="+18% ce mois-ci" tone="green" />
        <MetricCard icon={Clock3} label="Temps de réponse moyen" value="18 min" detail="-12% cette semaine" tone="gold" />
        <MetricCard icon={UsersRound} label="Experts disponibles" value="148" detail="Dans votre zone" tone="blue" />
        <MetricCard icon={ShieldCheck} label="Cas résolus" value="92%" detail="Sur les 30 derniers jours" tone="purple" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="ag-card overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="ag-section-kicker">Accès rapide</p>
              <h2 className="ag-section-title">De quoi avez-vous besoin aujourd’hui ?</h2>
              <p className="mt-2 max-w-xl text-sm text-obsidian-600 dark:text-cream-300">Décrivez votre situation par écrit ou par la voix. Un expert certifié vous répondra dans les meilleurs délais.</p>
            </div>
            <span className="hidden rounded-full bg-territory-50 px-3 py-1.5 text-xs font-bold text-territory-700 dark:bg-territory-500/10 dark:text-territory-300 sm:inline-flex">Service national</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" className="ag-button-primary min-h-[58px] justify-between px-4" onClick={() => onNavigate('feed')}>
              <span className="flex items-center gap-3"><MessageCircle className="h-5 w-5" /> Poser une question</span><ArrowUpRight className="h-4 w-4" />
            </button>
            <button type="button" className="ag-button-emergency min-h-[58px] justify-between px-4" onClick={() => onNavigate('emergency')}>
              <span className="flex items-center gap-3"><Siren className="h-5 w-5" /> Signaler une urgence</span><ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="ag-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="ag-section-kicker">Territoire</p>
              <h2 className="ag-section-title">Experts à proximité</h2>
            </div>
            <MapPinned className="h-5 w-5 text-territory-600 dark:text-territory-400" />
          </div>
          <div className="mt-5 flex items-center gap-4 rounded-control bg-territory-50 p-4 dark:bg-territory-500/10">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-territory-900 text-white dark:bg-territory-500 dark:text-obsidian-950"><span className="text-xl font-bold">148</span></div>
            <div><p className="text-sm font-bold text-obsidian-800 dark:text-cream-100">Professionnels en ligne</p><p className="mt-1 text-xs text-obsidian-600 dark:text-cream-300">Rayon de 50 km autour de votre exploitation</p></div>
          </div>
          <button type="button" className="ag-button-secondary mt-4 w-full" onClick={() => onNavigate('directory')}>Voir l’annuaire <ArrowUpRight className="h-4 w-4" /></button>
        </div>
      </section>

      <section className="ag-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><p className="ag-section-kicker">Votre activité</p><h2 className="ag-section-title">Suivi des derniers échanges</h2></div>
          <button type="button" className="ag-button-ghost w-fit px-3 text-xs" onClick={() => onNavigate('feed')}>Voir tout <ArrowUpRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <ActivityItem category="Agriculture" title="Feuilles de maïs jaunissantes" status="Réponse reçue" statusTone="green" time="Il y a 18 min" />
          <ActivityItem category="Élevage / Vétérinaire" title="Prévention de la maladie de Newcastle" status="En cours" statusTone="gold" time="Hier, 16:40" />
          <ActivityItem category="Fiche technique" title="Calendrier de fertilisation du coton" status="À consulter" statusTone="blue" time="Il y a 3 jours" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }: { icon: typeof MessageCircle; label: string; value: string; detail: string; tone: 'green' | 'gold' | 'blue' | 'purple' }) {
  const toneClasses = { green: 'bg-territory-500/10 text-territory-700 dark:text-territory-300', gold: 'bg-gold-500/10 text-gold-700 dark:text-gold-300', blue: 'bg-medical-500/10 text-medical-600 dark:text-medical-500', purple: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' };
  return <div className="ag-card p-5"><div className="flex items-start justify-between gap-3"><span className={['flex h-11 w-11 items-center justify-center rounded-xl', toneClasses[tone]].join(' ')}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-success-600" /></div><p className="mt-4 text-sm text-obsidian-600 dark:text-cream-300">{label}</p><p className="mt-1 text-2xl font-extrabold tracking-tight text-obsidian-950 dark:text-cream-50">{value}</p><p className="mt-1 text-xs font-medium text-success-600 dark:text-success-500">{detail}</p></div>;
}

function ActivityItem({ category, title, status, statusTone, time }: { category: string; title: string; status: string; statusTone: 'green' | 'gold' | 'blue'; time: string }) {
  const statusClasses = { green: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500', gold: 'bg-gold-100 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300', blue: 'bg-medical-50 text-medical-600 dark:bg-medical-500/10 dark:text-medical-500' };
  return <article className="rounded-control border border-cream-300/70 p-4 transition hover:border-territory-300 dark:border-obsidian-700 dark:hover:border-territory-700"><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-wide text-obsidian-600 dark:text-cream-300">{category}</span><span className={['rounded-full px-2 py-1 text-[10px] font-bold', statusClasses[statusTone]].join(' ')}>{status}</span></div><h3 className="mt-3 line-clamp-2 text-sm font-bold text-obsidian-900 dark:text-cream-50">{title}</h3><p className="mt-3 text-xs text-obsidian-600 dark:text-cream-300">{time}</p></article>;
}

export default App;
