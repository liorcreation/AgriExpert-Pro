import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowUpRight, CalendarRange, Clock3, Download, FileWarning, Gauge, MapPinned, Radio, ShieldCheck, Target, UsersRound } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertHeatmap } from '../../components/institutional/AlertHeatmap';

type Period = '7d' | '30d' | '90d';
type AlertLevel = 'critical' | 'high' | 'medium';

const trendData = [
  { day: 'Lun', demandes: 84, resolues: 72, delai: 22 },
  { day: 'Mar', demandes: 102, resolues: 89, delai: 19 },
  { day: 'Mer', demandes: 96, resolues: 84, delai: 18 },
  { day: 'Jeu', demandes: 128, resolues: 108, delai: 16 },
  { day: 'Ven', demandes: 117, resolues: 103, delai: 17 },
  { day: 'Sam', demandes: 73, resolues: 66, delai: 14 },
  { day: 'Dim', demandes: 59, resolues: 55, delai: 13 },
];

const alerts: Array<{ level: AlertLevel; title: string; region: string; count: string; time: string }> = [
  { level: 'critical', title: 'Foyer phytosanitaire détecté', region: 'Boucle du Mouhoun', count: '26 signalements', time: 'Il y a 28 min' },
  { level: 'high', title: 'Suspicion de maladie animale', region: 'Centre-Nord · Kaya', count: '18 signalements', time: 'Il y a 1 h' },
  { level: 'medium', title: 'Mortalité piscicole signalée', region: 'Hauts-Bassins · Bobo', count: '11 signalements', time: 'Il y a 3 h' },
];

const categoryData = [
  { name: 'Agriculture', value: 46, color: '#10B981' },
  { name: 'Élevage', value: 31, color: '#D4AF37' },
  { name: 'Pisciculture', value: 14, color: '#0891B2' },
  { name: 'Apiculture', value: 9, color: '#F79009' },
];

export function InstitutionalDashboard({ onBack }: { onBack: () => void }) {
  const [period, setPeriod] = useState<Period>('7d');
  const [region, setRegion] = useState('national');
  const [exported, setExported] = useState(false);
  const periodLabel = period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : '90 derniers jours';
  const regionLabel = region === 'national' ? 'National' : region === 'centre' ? 'Région du Centre' : 'Hauts-Bassins';
  const chartData = useMemo(() => period === '7d' ? trendData : trendData.map((item) => ({ ...item, demandes: Math.round(item.demandes * (period === '30d' ? 1.4 : 2.1)), resolues: Math.round(item.resolues * (period === '30d' ? 1.42 : 2.14)) })), [period]);
  const totalRequests = useMemo(() => chartData.reduce((sum, item) => sum + item.demandes, 0), [chartData]);

  return <div className="agri-institutional-page">
    <header className="agri-institutional-hero"><div className="agri-institutional-hero-copy"><button type="button" className="agri-institutional-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button><div className="agri-institutional-eyebrow"><span /> Cockpit ministère · AgriExpert</div><h1>Piloter le territoire,<br /><em>décider plus vite.</em></h1><p>Une lecture consolidée des demandes, alertes et capacités d’intervention pour coordonner chaque décision agricole au bon niveau.</p><div className="agri-institutional-hero-meta"><span><Radio className="h-3.5 w-3.5" /> Réseau opérationnel</span><span><CalendarRange className="h-3.5 w-3.5" /> Données du 5 octobre 2026</span></div></div><div className="agri-institutional-command"><div className="agri-institutional-command-orbit" /><div className="agri-institutional-command-core"><Gauge className="h-5 w-5" /><strong>92,4%</strong><span>résolution nationale</span></div><div className="agri-institutional-command-chip agri-command-chip-one"><span><Activity className="h-3 w-3" /></span><b>148</b><small>experts actifs</small></div><div className="agri-institutional-command-chip agri-command-chip-two"><span><AlertTriangle className="h-3 w-3" /></span><b>67</b><small>alertes à suivre</small></div></div></header>
    <section className="agri-institutional-controls"><div className="agri-institutional-context"><span className="agri-institutional-section-kicker">Vue de supervision</span><h2>Les signaux qui orientent l’action</h2><p>{periodLabel} · {regionLabel}</p></div><div className="agri-institutional-actions"><label className="agri-institutional-select"><MapPinned className="h-4 w-4" /><span className="sr-only">Filtrer par région</span><select id="region-filter" value={region} onChange={(event) => setRegion(event.target.value)}><option value="national">National</option><option value="centre">Région du Centre</option><option value="hauts-bassins">Hauts-Bassins</option></select></label><div className="agri-institutional-periods" role="group" aria-label="Période d’analyse">{(['7d', '30d', '90d'] as Period[]).map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} className={period === item ? 'agri-institutional-period-active' : ''}>{item}</button>)}</div><button type="button" className="agri-institutional-export" onClick={() => setExported(true)}><Download className="h-4 w-4" /> {exported ? 'Export prêt' : 'Exporter'}</button></div></section>
    <section className="agri-institutional-kpis"><InstitutionMetric icon={Target} label="Taux de résolution" value="92,4 %" trend="+4,8 %" tone="green" detail="des cas clôturés" /><InstitutionMetric icon={Clock3} label="Temps moyen de réponse" value="18 min" trend="-12,6 %" tone="gold" inverse detail="versus période précédente" /><InstitutionMetric icon={AlertTriangle} label="Alertes actives" value="67" trend="+8" tone="red" detail="dont 3 critiques" /><InstitutionMetric icon={UsersRound} label="Experts disponibles" value="148" trend="+16 %" tone="blue" detail="sur le réseau national" /></section>
    <section className="agri-institutional-main-grid"><div className="agri-institutional-chart-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Activité du réseau</span><h2>Demandes et résolutions</h2><p>{totalRequests} demandes enregistrées · {regionLabel}</p></div><span className="agri-institutional-live"><i /> Données actualisées</span></div><div className="agri-institutional-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><defs><linearGradient id="institutionalRequestFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2DDCC" opacity={0.7} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2DDCC', boxShadow: '0 10px 30px rgba(15,61,46,.12)', fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Area type="monotone" dataKey="demandes" name="Demandes" stroke="#0F3D2E" strokeWidth={2.5} fill="url(#institutionalRequestFill)" /><Area type="monotone" dataKey="resolues" name="Résolues" stroke="#D4AF37" strokeWidth={2} fill="none" /></AreaChart></ResponsiveContainer></div></div><div className="agri-institutional-coverage-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Capacité d’intervention</span><h2>Couverture du réseau</h2></div><ShieldCheck className="agri-institutional-card-icon" /></div><div className="agri-institutional-coverage-visual"><div className="agri-institutional-coverage-ring"><strong>86%</strong><span>territoires couverts</span></div></div><div className="agri-institutional-coverage-list"><span><i className="coverage-green" /> Réponse opérationnelle <b>94%</b></span><span><i className="coverage-gold" /> Experts mobilisables <b>82%</b></span><span><i className="coverage-blue" /> Laboratoires partenaires <b>68%</b></span></div></div></section>
    <section className="agri-institutional-lower-grid"><div className="agri-institutional-map-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Veille territoriale</span><h2>Carte thermique des alertes</h2><p>Intensité des signalements sur le territoire</p></div><span className="agri-institutional-map-legend"><i /> Niveau d’alerte</span></div><div className="agri-institutional-map-wrap"><AlertHeatmap /></div></div><div className="agri-institutional-alerts-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Priorités d’action</span><h2>Alertes à traiter</h2></div><FileWarning className="agri-institutional-alert-icon" /></div><div className="agri-institutional-alert-list">{alerts.map((alert) => <AlertItem key={alert.title} {...alert} />)}</div><button type="button" className="agri-institutional-all-alerts">Voir toutes les alertes <ArrowUpRight className="h-4 w-4" /></button></div></section>
    <section className="agri-institutional-response-card"><div className="agri-institutional-card-head"><div><span className="agri-institutional-section-kicker">Performance opérationnelle</span><h2>Délai moyen de réponse par jour</h2><p>Une baisse continue qui confirme la capacité du réseau à absorber la demande.</p></div><span className="agri-institutional-improvement"><ArrowDownRight className="h-4 w-4" /> Amélioration de 12,6 %</span></div><div className="agri-institutional-response-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2DDCC" opacity={0.7} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} unit=" min" /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2DDCC', fontSize: 12 }} /><Bar dataKey="delai" name="Délai moyen" fill="#10B981" radius={[6, 6, 0, 0]} barSize={28} /></BarChart></ResponsiveContainer></div></section>
    <section className="agri-sponsor-card"><div><span className="agri-institutional-section-kicker">Espace Parrainage · Partenaires</span><h2>Suivre l’impact producteur par région</h2><p>Une lecture agrégée et anonymisée des producteurs accompagnés par les ministères et ONG partenaires.</p></div><div className="agri-sponsor-regions"><SponsorRegion label="Boucle du Mouhoun" value="78%" count="2 840 producteurs" /><SponsorRegion label="Centre-Nord" value="64%" count="1 920 producteurs" /><SponsorRegion label="Hauts-Bassins" value="58%" count="1 460 producteurs" /></div><button type="button" className="agri-sponsor-action">Ouvrir le rapport partenaire <ArrowUpRight className="h-4 w-4" /></button></section>
  </div>;
}

function InstitutionMetric({ icon: Icon, label, value, trend, tone, inverse, detail }: { icon: typeof Activity; label: string; value: string; trend: string; tone: 'green' | 'gold' | 'red' | 'blue'; inverse?: boolean; detail: string }) {
  return <div className={`agri-institutional-kpi agri-kpi-${tone}`}><div className="agri-institutional-kpi-top"><span className="agri-institutional-kpi-icon"><Icon className="h-5 w-5" /></span><span className={inverse ? 'agri-kpi-trend agri-kpi-trend-good' : tone === 'red' ? 'agri-kpi-trend agri-kpi-trend-bad' : 'agri-kpi-trend'}>{inverse ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}{trend}</span></div><span className="agri-institutional-kpi-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function AlertItem({ level, title, region, count, time }: { level: AlertLevel; title: string; region: string; count: string; time: string }) {
  const label = level === 'critical' ? 'Critique' : level === 'high' ? 'Prioritaire' : 'Surveillance';
  return <div className={`agri-institutional-alert agri-alert-${level}`}><div className="agri-institutional-alert-level"><span /> {label}</div><div className="agri-institutional-alert-content"><strong>{title}</strong><p>{region} · {count}</p><small>{time}</small></div><ArrowUpRight className="agri-institutional-alert-arrow h-4 w-4" /></div>;
}

function SponsorRegion({ label, value, count }: { label: string; value: string; count: string }) {
  return <div className="agri-sponsor-region"><div><strong>{label}</strong><span>{count}</span></div><b>{value}</b><i><span style={{ width: value }} /></i></div>;
}
