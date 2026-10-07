import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowUpRight, CalendarRange, Clock3, Download, FileWarning, Gauge, MapPinned, Radio, ShieldCheck, Target, UsersRound } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertHeatmap } from '../../components/institutional/AlertHeatmap';
import { downloadInstitutionalCsv, getInstitutionalDashboard, openInstitutionalReport, type InstitutionalDashboardData } from '../../lib/api';

type Period = '7d' | '30d' | '90d';
type AlertLevel = 'critical' | 'high' | 'medium';
const periodLabels: Record<Period, string> = { '7d': '7 derniers jours', '30d': '30 derniers jours', '90d': '90 derniers jours' };

export function InstitutionalDashboard({ onBack }: { onBack: () => void }) {
  const [period, setPeriod] = useState<Period>('7d');
  const [region, setRegion] = useState('national');
  const [dashboard, setDashboard] = useState<InstitutionalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void getInstitutionalDashboard(period, region).then((response) => {
      if (!active) return;
      setDashboard(response.data);
      if (region !== response.data.filters.region) setRegion(response.data.filters.region);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Le cockpit institutionnel est indisponible.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, region]);

  const periodLabel = periodLabels[period];
  const regionOptions = dashboard?.filters.regions ?? [{ region_code: 'national', region_name: 'National' }];
  const regionLabel = regionOptions.find((item) => item.region_code === region)?.region_name ?? 'National';
  const trend = dashboard?.trend ?? [];
  const alerts = dashboard?.alerts ?? [];
  const heatmap = dashboard?.heatmap.map((item) => ({ ...item, type: item.name, position: [item.latitude, item.longitude] as [number, number] })) ?? [];
  const totalRequests = dashboard?.kpis.totalRequests ?? 0;
  const lastUpdated = dashboard ? new Date(dashboard.lastUpdated).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Synchronisation en cours';

  async function handleExport() {
    setExporting(true); setError('');
    try { await downloadInstitutionalCsv(period, region); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Export CSV impossible.'); } finally { setExporting(false); }
  }

  async function handleReport() {
    setReporting(true); setError('');
    try { openInstitutionalReport(period, region); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Rapport indisponible.'); } finally { setReporting(false); }
  }

  return <div className="agri-institutional-page">
    <header className="agri-institutional-hero"><div className="agri-institutional-hero-copy"><button type="button" className="agri-institutional-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button><div className="agri-institutional-eyebrow"><span /> Cockpit institutionnel · AgriExpert</div><h1>Piloter le territoire,<br /><em>décider plus vite.</em></h1><p>Une lecture consolidée des demandes, alertes et capacités d’intervention, avec des données agrégées et protégées pour chaque partenaire habilité.</p><div className="agri-institutional-hero-meta"><span><Radio className="h-3.5 w-3.5" /> {dashboard?.scope.institutionName ?? 'Périmètre sécurisé'}</span><span><CalendarRange className="h-3.5 w-3.5" /> {lastUpdated}</span></div></div><div className="agri-institutional-command"><div className="agri-institutional-command-orbit" /><div className="agri-institutional-command-core"><Gauge className="h-5 w-5" /><strong>{formatPercent(dashboard?.kpis.resolutionRate)}</strong><span>résolution observée</span></div><div className="agri-institutional-command-chip agri-command-chip-one"><span><Activity className="h-3 w-3" /></span><b>{dashboard?.kpis.availableExperts ?? '—'}</b><small>experts disponibles</small></div><div className="agri-institutional-command-chip agri-command-chip-two"><span><AlertTriangle className="h-3 w-3" /></span><b>{dashboard?.kpis.activeAlerts ?? '—'}</b><small>alertes actives</small></div></div></header>

    <section className="agri-institutional-controls"><div className="agri-institutional-context"><span className="agri-institutional-section-kicker">Vue de supervision</span><h2>Les signaux qui orientent l’action</h2><p>{periodLabel} · {regionLabel} · source : {dashboard?.source ?? 'D1 sécurisé'}</p></div><div className="agri-institutional-actions"><label className="agri-institutional-select"><MapPinned className="h-4 w-4" /><span className="sr-only">Filtrer par région</span><select id="region-filter" value={region} onChange={(event) => setRegion(event.target.value)} disabled={loading}><option value="national">National</option>{regionOptions.filter((item) => item.region_code !== 'national').map((item) => <option key={item.region_code} value={item.region_code}>{item.region_name}</option>)}</select></label><div className="agri-institutional-periods" role="group" aria-label="Période d’analyse">{(['7d', '30d', '90d'] as Period[]).map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} className={period === item ? 'agri-institutional-period-active' : ''}>{item}</button>)}</div><button type="button" className="agri-institutional-export" onClick={() => void handleExport()} disabled={exporting || loading}><Download className="h-4 w-4" /> {exporting ? 'Préparation…' : 'Exporter CSV'}</button></div></section>
    {error && <div className="agri-institutional-error" role="alert">{error}</div>}
    {loading && <div className="agri-institutional-loading" role="status"><span className="agri-institutional-loading-pulse" /> Synchronisation sécurisée des agrégats institutionnels…</div>}

    <section className="agri-institutional-kpis"><InstitutionMetric icon={Target} label="Taux de résolution" value={formatPercent(dashboard?.kpis.resolutionRate)} trend="Données live" tone="green" detail="des demandes closes ou suivies" /><InstitutionMetric icon={Clock3} label="Temps moyen de réponse" value={dashboard?.kpis.averageResponseMinutes ? `${dashboard.kpis.averageResponseMinutes} min` : '—'} trend="Mesuré" tone="gold" detail="sur les demandes ayant une réponse" /><InstitutionMetric icon={AlertTriangle} label="Alertes actives" value={String(dashboard?.kpis.activeAlerts ?? '—')} trend={dashboard ? `${dashboard.kpis.criticalAlerts} critique${dashboard.kpis.criticalAlerts > 1 ? 's' : ''}` : '—'} tone="red" detail="signalements SOS ouverts ou assignés" /><InstitutionMetric icon={UsersRound} label="Experts disponibles" value={String(dashboard?.kpis.availableExperts ?? '—')} trend={dashboard ? `sur ${dashboard.kpis.totalExperts}` : '—'} tone="blue" detail="présence récente confirmée" /></section>

    <motion.section className="agri-institutional-main-grid" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}><div className="agri-institutional-chart-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Activité du réseau</span><h2>Demandes et résolutions</h2><p>{totalRequests} demande{totalRequests > 1 ? 's' : ''} enregistrée{totalRequests > 1 ? 's' : ''} · {regionLabel}</p></div><span className="agri-institutional-live"><i /> Agrégation en direct</span></div><div className="agri-institutional-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><defs><linearGradient id="institutionalRequestFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2DDCC" opacity={0.7} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2DDCC', boxShadow: '0 10px 30px rgba(15,61,46,.12)', fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Area type="monotone" dataKey="demandes" name="Demandes" stroke="#0F3D2E" strokeWidth={2.5} fill="url(#institutionalRequestFill)" /><Area type="monotone" dataKey="resolues" name="Résolues" stroke="#D4AF37" strokeWidth={2} fill="none" /></AreaChart></ResponsiveContainer></div></div><div className="agri-institutional-coverage-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Capacité d’intervention</span><h2>Couverture du réseau</h2></div><ShieldCheck className="agri-institutional-card-icon" /></div><div className="agri-institutional-coverage-visual"><div className="agri-institutional-coverage-ring"><strong>{formatPercent(dashboard?.coverage.territoriesCovered)}</strong><span>territoires couverts</span></div></div><div className="agri-institutional-coverage-list"><span><i className="coverage-green" /> Réponse opérationnelle <b>{formatPercent(dashboard?.coverage.responseOperational)}</b></span><span><i className="coverage-gold" /> Experts mobilisables <b>{formatPercent(dashboard?.coverage.expertsMobilisable)}</b></span><span><i className="coverage-blue" /> Laboratoires partenaires <b>{dashboard?.coverage.laboratories == null ? 'À renseigner' : formatPercent(dashboard.coverage.laboratories)}</b></span></div></div></motion.section>

    <section className="agri-institutional-lower-grid"><div className="agri-institutional-map-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Veille territoriale</span><h2>Carte thermique des alertes</h2><p>Positions arrondies et volumes agrégés, sans donnée individuelle</p></div><span className="agri-institutional-map-legend"><i /> Niveau d’alerte</span></div><div className="agri-institutional-map-wrap"><AlertHeatmap points={heatmap} /></div></div><div className="agri-institutional-alerts-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Priorités d’action</span><h2>Alertes à traiter</h2></div><FileWarning className="agri-institutional-alert-icon" /></div><div className="agri-institutional-alert-list">{(showAllAlerts ? alerts : alerts.slice(0, 3)).map((alert, index) => <AlertItem key={`${alert.title}-${alert.region}-${index}`} {...alert} />)}</div><button type="button" className="agri-institutional-all-alerts" onClick={() => setShowAllAlerts((value) => !value)}>{showAllAlerts ? 'Réduire la liste' : `Voir toutes les alertes (${alerts.length})`} <ArrowUpRight className="h-4 w-4" /></button></div></section>

    <section className="agri-institutional-response-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Performance opérationnelle</span><h2>Délai moyen de réponse par jour</h2><p>Calculé uniquement sur les demandes disposant d’une première réponse.</p></div><span className="agri-institutional-improvement"><ArrowDownRight className="h-4 w-4" /> Mesure réelle</span></div><div className="agri-institutional-response-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2DDCC" opacity={0.7} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} unit=" min" /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2DDCC', fontSize: 12 }} /><Bar dataKey="delai" name="Délai moyen" fill="#10B981" radius={[6, 6, 0, 0]} barSize={28} /></BarChart></ResponsiveContainer></div></section>

    <section className="agri-sponsor-card"><div><span className="agri-institutional-section-kicker">Espace Parrainage · Partenaires</span><h2>Suivre l’impact producteur par région</h2><p>Les groupes de moins de cinq producteurs sont volontairement masqués. Les volumes affichés proviennent des demandes persistées.</p></div><div className="agri-sponsor-regions">{(dashboard?.sponsors ?? []).length ? dashboard?.sponsors.map((item) => <SponsorRegion key={item.label} {...item} />) : <p className="agri-sponsor-empty">Aucune région avec suffisamment de données sur cette période.</p>}</div><button type="button" className="agri-sponsor-action" onClick={() => void handleReport()} disabled={reporting || loading}>{reporting ? 'Ouverture…' : 'Ouvrir le rapport partenaire'} <ArrowUpRight className="h-4 w-4" /></button></section>
  </div>;
}

function formatPercent(value: number | undefined) { return value == null ? '—' : `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`; }

function InstitutionMetric({ icon: Icon, label, value, trend, tone, detail }: { icon: typeof Activity; label: string; value: string; trend: string; tone: 'green' | 'gold' | 'red' | 'blue'; detail: string }) {
  return <div className={`agri-institutional-kpi agri-kpi-${tone}`}><div className="agri-institutional-kpi-top"><span className="agri-institutional-kpi-icon"><Icon className="h-5 w-5" /></span><span className={tone === 'red' ? 'agri-kpi-trend agri-kpi-trend-bad' : 'agri-kpi-trend'}><ArrowUpRight className="h-3.5 w-3.5" />{trend}</span></div><span className="agri-institutional-kpi-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function AlertItem({ level, title, region, count, time }: { level: AlertLevel; title: string; region: string; count: string; time: string }) {
  const label = level === 'critical' ? 'Critique' : level === 'high' ? 'Prioritaire' : 'Surveillance';
  return <div className={`agri-institutional-alert agri-alert-${level}`}><div className="agri-institutional-alert-level"><span /> {label}</div><div className="agri-institutional-alert-content"><strong>{title}</strong><p>{region} · {count}</p><small>{time}</small></div><ArrowUpRight className="agri-institutional-alert-arrow h-4 w-4" /></div>;
}

function SponsorRegion({ label, status, value, count, reason }: { label: string; status: 'available' | 'suppressed'; value: number | null; count: number | null; reason?: string }) {
  if (status === 'suppressed') return <div className="agri-sponsor-region"><div><strong>{label}</strong><span>{reason ?? 'Données masquées'}</span></div><b>—</b><i><span style={{ width: '0%' }} /></i></div>;
  return <div className="agri-sponsor-region"><div><strong>{label}</strong><span>{count?.toLocaleString('fr-FR')} producteurs · {value}% des demandes</span></div><b>{value}%</b><i><span style={{ width: `${value}%` }} /></i></div>;
}
