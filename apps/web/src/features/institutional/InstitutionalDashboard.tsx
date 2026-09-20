import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowUpRight, Clock3, Download, FileWarning, ShieldCheck, UsersRound } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

const categoryData = [
  { name: 'Agriculture', value: 46, color: '#10B981' },
  { name: 'Élevage', value: 31, color: '#D4AF37' },
  { name: 'Pisciculture', value: 14, color: '#0891B2' },
  { name: 'Apiculture', value: 9, color: '#F79009' },
];

const alerts: Array<{ level: AlertLevel; title: string; region: string; count: string; time: string }> = [
  { level: 'critical', title: 'Foyer phytosanitaire détecté', region: 'Boucle du Mouhoun', count: '26 signalements', time: 'Il y a 28 min' },
  { level: 'high', title: 'Suspicion de maladie animale', region: 'Centre-Nord · Kaya', count: '18 signalements', time: 'Il y a 1 h' },
  { level: 'medium', title: 'Mortalité piscicole signalée', region: 'Hauts-Bassins · Bobo', count: '11 signalements', time: 'Il y a 3 h' },
];

export function InstitutionalDashboard({ onBack }: { onBack: () => void }) {
  const [period, setPeriod] = useState<Period>('7d');
  const [region, setRegion] = useState('national');
  const periodLabel = period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : '90 derniers jours';
  const regionLabel = region === 'national' ? 'National' : region === 'centre' ? 'Région du Centre' : 'Hauts-Bassins';
  const totalRequests = useMemo(() => trendData.reduce((sum, item) => sum + item.demandes, 0), []);

  return (
    <div className="animate-slide-in space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><button type="button" className="ag-button-ghost mb-4 -ml-3 px-3 text-xs" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button><p className="ag-section-kicker flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Vue ministère</p><h1 className="mt-2 text-display-lg text-obsidian-950 dark:text-cream-50">Pilotage institutionnel</h1><p className="mt-2 max-w-2xl text-body-lg text-obsidian-600 dark:text-cream-300">Une lecture consolidée des demandes, alertes et capacités d’intervention sur le territoire.</p></div><div className="flex flex-wrap items-center gap-2"><div className="relative"><label className="sr-only" htmlFor="region-filter">Filtrer par région</label><select id="region-filter" value={region} onChange={(event) => setRegion(event.target.value)} className="ag-input min-h-10 w-auto appearance-none py-2 pl-3 pr-8 text-xs font-bold"><option value="national">National</option><option value="centre">Région du Centre</option><option value="hauts-bassins">Hauts-Bassins</option></select></div><div className="flex rounded-control border border-cream-300 bg-cream-50 p-1 dark:border-obsidian-700 dark:bg-obsidian-900">{(['7d', '30d', '90d'] as Period[]).map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} className={['rounded-lg px-3 py-1.5 text-[11px] font-bold', period === item ? 'bg-territory-900 text-white dark:bg-territory-500 dark:text-obsidian-950' : 'text-obsidian-600 dark:text-cream-300'].join(' ')}>{item}</button>)}</div><button type="button" className="ag-button-secondary min-h-10 px-3 text-xs"><Download className="h-4 w-4" /> Exporter</button></div></div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><InstitutionMetric icon={Activity} label="Taux de résolution" value="92,4 %" trend="+4,8 %" tone="green" /><InstitutionMetric icon={Clock3} label="Temps moyen de réponse" value="18 min" trend="-12,6 %" tone="gold" inverse /><InstitutionMetric icon={AlertTriangle} label="Alertes actives" value="67" trend="+8 ce mois" tone="red" /><InstitutionMetric icon={UsersRound} label="Experts disponibles" value="148" trend="+16 %" tone="blue" /></section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]"><div className="ag-card p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="ag-section-kicker">Activité du réseau</p><h2 className="ag-section-title">Demandes et résolutions</h2><p className="mt-1 text-xs text-obsidian-600 dark:text-cream-300">{periodLabel} · {regionLabel} · {totalRequests} demandes enregistrées</p></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-[10px] font-bold text-success-600 dark:bg-success-500/10 dark:text-success-500"><span className="h-1.5 w-1.5 rounded-full bg-success-500" /> Données actualisées</span></div><div className="mt-5 h-[280px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><defs><linearGradient id="requestFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2DDCC" opacity={0.7} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2DDCC', boxShadow: '0 10px 30px rgba(15,61,46,.12)', fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Area type="monotone" dataKey="demandes" name="Demandes" stroke="#0F3D2E" strokeWidth={2.5} fill="url(#requestFill)" /><Area type="monotone" dataKey="resolues" name="Résolues" stroke="#D4AF37" strokeWidth={2} fill="none" /></AreaChart></ResponsiveContainer></div></div><div className="ag-card p-5 sm:p-6"><p className="ag-section-kicker">Répartition</p><h2 className="ag-section-title">Demandes par secteur</h2><p className="mt-1 text-xs text-obsidian-600 dark:text-cream-300">Part du volume total</p><div className="mt-2 h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={3}>{categoryData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2DDCC', fontSize: 12 }} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{categoryData.map((item) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-obsidian-600 dark:text-cream-300"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-bold text-obsidian-800 dark:text-cream-100">{item.value}%</span></div>)}</div></div></section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]"><div><div className="mb-4 flex items-end justify-between gap-3"><div><p className="ag-section-kicker">Veille territoriale</p><h2 className="ag-section-title">Carte thermique des alertes</h2></div><span className="hidden text-xs text-obsidian-600 dark:text-cream-300 sm:block">Source : signalements AgriExpert Pro</span></div><AlertHeatmap /></div><div className="ag-card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="ag-section-kicker">Priorités d’action</p><h2 className="ag-section-title">Alertes à traiter</h2></div><FileWarning className="h-5 w-5 text-danger-600 dark:text-danger-500" /></div><div className="mt-5 space-y-3">{alerts.map((alert) => <AlertItem key={alert.title} {...alert} />)}</div><button type="button" className="ag-button-secondary mt-5 w-full text-xs">Voir toutes les alertes <ArrowUpRight className="h-4 w-4" /></button></div></section>

      <section className="ag-card overflow-hidden"><div className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center sm:p-6"><div><p className="ag-section-kicker">Performance opérationnelle</p><h2 className="ag-section-title">Délai moyen de réponse par jour</h2></div><div className="flex items-center gap-2 text-xs font-semibold text-success-600"><ArrowDownRight className="h-4 w-4" /> Amélioration de 12,6 %</div></div><div className="h-[250px] w-full px-3 pb-5 sm:px-6"><ResponsiveContainer width="100%" height="100%"><BarChart data={trendData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2DDCC" opacity={0.7} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#516070' }} unit=" min" /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2DDCC', fontSize: 12 }} /><Bar dataKey="delai" name="Délai moyen" fill="#10B981" radius={[6, 6, 0, 0]} barSize={28} /></BarChart></ResponsiveContainer></div></section>
    </div>
  );
}

function InstitutionMetric({ icon: Icon, label, value, trend, tone, inverse = false }: { icon: typeof Activity; label: string; value: string; trend: string; tone: 'green' | 'gold' | 'red' | 'blue'; inverse?: boolean }) {
  const toneClasses = { green: 'bg-territory-500/10 text-territory-700 dark:text-territory-300', gold: 'bg-gold-500/10 text-gold-700 dark:text-gold-300', red: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500', blue: 'bg-medical-500/10 text-medical-600 dark:text-medical-500' };
  return <div className="ag-card p-5"><div className="flex items-start justify-between gap-3"><span className={['flex h-10 w-10 items-center justify-center rounded-xl', toneClasses[tone]].join(' ')}><Icon className="h-5 w-5" /></span><span className={['flex items-center gap-1 text-[11px] font-bold', inverse ? 'text-success-600' : tone === 'red' ? 'text-danger-600' : 'text-success-600'].join(' ')}>{inverse ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}{trend}</span></div><p className="mt-4 text-xs text-obsidian-600 dark:text-cream-300">{label}</p><p className="mt-1 text-2xl font-extrabold text-obsidian-950 dark:text-cream-50">{value}</p></div>;
}

function AlertItem({ level, title, region, count, time }: { level: 'critical' | 'high' | 'medium'; title: string; region: string; count: string; time: string }) {
  const levelStyle = { critical: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500', high: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500', medium: 'bg-medical-50 text-medical-600 dark:bg-medical-500/10 dark:text-medical-500' }[level];
  const label = level === 'critical' ? 'Critique' : level === 'high' ? 'Prioritaire' : 'Surveillance';
  return <div className="rounded-control border border-cream-300/70 p-3 dark:border-obsidian-700"><div className="flex items-start gap-3"><span className={['mt-0.5 rounded-full px-2 py-1 text-[10px] font-bold', levelStyle].join(' ')}>{label}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-obsidian-900 dark:text-cream-50">{title}</p><p className="mt-1 text-[11px] text-obsidian-600 dark:text-cream-300">{region} · {count}</p><p className="mt-2 text-[10px] text-obsidian-600 dark:text-cream-300">{time}</p></div></div></div>;
}
