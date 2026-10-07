import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Banknote, CheckCircle2, CreditCard, FileText, LockKeyhole, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { configureBillingPlan, getBillingOverview, type BillingOverview } from '../../lib/api';

const featureLabels: Record<string, string> = {
  photo_diagnosis: 'Diagnostic photo assisté',
  offline_sync: 'Synchronisation hors-ligne',
  expert_priority: 'Priorité réseau expert',
  institution_reports: 'Rapports institutionnels',
  team_seats: 'Membres d’équipe',
};

export function BillingPage({ onBack }: { onBack: () => void }) {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); void getBillingOverview().then((response) => setOverview(response.data)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Impossible de charger la facturation.')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const currentPlan = useMemo(() => overview?.plans.find((plan) => plan.code === overview.currentPlan), [overview]);
  return <div className="agri-billing-page">
    <header className="agri-billing-hero"><div><button type="button" className="agri-soft-action" onClick={onBack}>← Retour au tableau de bord</button><span className="agri-section-kicker">ESPACE COMMERCIAL SÉCURISÉ</span><h1>Une offre claire, sans surprise.</h1><p>Gérez votre formule, vos paiements et vos reçus depuis un espace unique. Les prix sont affichés en franc CFA (XOF).</p></div><div className="agri-billing-hero-mark"><WalletCards className="h-7 w-7" /><strong>Facturation prête</strong><small>Activation contrôlée côté serveur</small></div></header>
    {error && <div className="agri-billing-alert" role="alert">{error}</div>}
    {loading ? <div className="agri-billing-loading"><RefreshCw className="h-4 w-4 animate-spin" /> Chargement de votre espace commercial…</div> : overview && <>
      {!overview.storageReady && <div className="agri-billing-alert"><LockKeyhole className="inline h-4 w-4" /> La facturation est en cours de préparation technique. Aucun paiement ne peut être lancé tant que l’espace serveur n’est pas activé.</div>}
      <section className="agri-billing-status"><div className="agri-billing-status-icon"><CheckCircle2 className="h-5 w-5" /></div><div><span>FORMULE ACTUELLE</span><strong>{currentPlan?.name ?? overview.currentPlan}</strong><small>{overview.currentPlan === 'free' ? 'Accès essentiel actif. Aucun paiement demandé.' : 'Votre accès dépend de l’état de votre abonnement.'}</small></div><span className="agri-billing-state">{overview.subscription?.status ?? 'active'}</span></section>
      <div className="agri-billing-grid">{overview.plans.map((plan) => <PlanCard key={plan.code} plan={plan} current={plan.code === overview.currentPlan} />)}</div>
      <section className="agri-billing-trust"><div><ShieldCheck className="h-5 w-5" /><strong>Paiement vérifié avant activation</strong><p>Une formule payante ne sera activée qu’après confirmation serveur du prestataire. Le navigateur ne peut jamais s’attribuer PRO tout seul.</p></div><div><Banknote className="h-5 w-5" /><strong>Moyens prévus pour le Burkina Faso</strong><p>Le parcours est prévu pour le XOF et pourra accueillir Mobile Money local et carte bancaire après activation du compte marchand.</p></div><div><FileText className="h-5 w-5" /><strong>Reçus et suivi</strong><p>Chaque paiement confirmé produira un reçu et une trace d’audit consultable par l’équipe habilitée.</p></div></section>
      <section className="agri-billing-payments"><div className="agri-billing-section-head"><div><span className="agri-section-kicker">HISTORIQUE</span><h2>Vos paiements</h2></div><span>{overview.payments.length} opération{overview.payments.length > 1 ? 's' : ''}</span></div>{overview.payments.length === 0 ? <p className="agri-billing-empty">Aucun paiement enregistré. Vous êtes actuellement sur une offre sans paiement.</p> : <div className="agri-billing-table">{overview.payments.map((payment) => <div key={payment.id}><span>#{payment.id} · {payment.plan_code.toUpperCase()}</span><strong>{payment.amount_xof.toLocaleString('fr-FR')} XOF</strong><small>{payment.status} · {new Date(payment.created_at).toLocaleDateString('fr-FR')}</small></div>)}</div>}</section>
      {overview.isAdmin && <BillingAdmin plans={overview.plans} onSaved={load} />}
    </>}
  </div>;
}

function PlanCard({ plan, current }: { plan: BillingOverview['plans'][number]; current: boolean }) {
  const price = plan.amount_xof == null ? 'Prix à configurer' : plan.amount_xof === 0 ? 'Gratuit' : `${plan.amount_xof.toLocaleString('fr-FR')} XOF`;
  const features = plan.features.length ? plan.features : plan.code === 'free' ? ['Conseils et échanges terrain', 'Accès aux fiches techniques', 'Suivi de vos demandes'] : ['Fonctionnalités à définir par l’administrateur'];
  return <article className={current ? 'agri-billing-plan agri-billing-plan-current' : 'agri-billing-plan'}><div className="agri-billing-plan-head"><span className="agri-billing-plan-icon"><CreditCard className="h-4 w-4" /></span>{current && <span className="agri-billing-current">Active</span>}</div><span className="agri-billing-plan-kicker">{plan.code === 'institution' ? 'POUR LES ORGANISATIONS' : plan.code === 'pro' ? 'POUR LES PROFESSIONNELS' : 'POUR DÉMARRER'}</span><h2>{plan.name}</h2><strong className="agri-billing-price">{price}</strong><small>{plan.billing_interval === 'month' ? 'par mois' : plan.billing_interval === 'year' ? 'par an' : plan.billing_interval === 'contract' ? 'sur contrat' : 'sans engagement'}</small><ul>{features.map((feature) => <li key={feature}><BadgeCheck className="h-3.5 w-3.5" /> {featureLabels[feature] ?? feature}</li>)}</ul><button type="button" disabled={!plan.sales_enabled || current}>{current ? 'Formule active' : plan.sales_enabled ? 'Choisir cette formule' : 'Bientôt disponible'}</button></article>;
}

function BillingAdmin({ plans, onSaved }: { plans: BillingOverview['plans']; onSaved: () => void }) {
  const [code, setCode] = useState<'pro' | 'institution'>('pro');
  const plan = plans.find((item) => item.code === code);
  const [amount, setAmount] = useState<number | ''>(plan?.amount_xof ?? '');
  const [interval, setInterval] = useState<'month' | 'year' | 'contract'>((plan?.billing_interval as 'month' | 'year' | 'contract') || 'month');
  const [enabled, setEnabled] = useState(Boolean(plan?.sales_enabled));
  const [message, setMessage] = useState('');
  useEffect(() => { const selected = plans.find((item) => item.code === code); setAmount(selected?.amount_xof ?? ''); setInterval((selected?.billing_interval as 'month' | 'year' | 'contract') || 'month'); setEnabled(Boolean(selected?.sales_enabled)); }, [code, plans]);
  const save = async () => { setMessage(''); try { await configureBillingPlan({ code, amountXof: amount, interval, salesEnabled: enabled, features: plan?.features ?? [], quotas: plan?.quotas ?? {} }); setMessage('Offre enregistrée.'); onSaved(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.'); } };
  return <section className="agri-billing-admin"><div><span className="agri-section-kicker">ADMINISTRATION</span><h2>Configurer les offres</h2><p>Cette zone est protégée par une allowlist serveur. Aucun prix par défaut n’est inventé.</p></div><div className="agri-billing-admin-form"><label>Offre<select value={code} onChange={(event) => setCode(event.target.value as 'pro' | 'institution')}><option value="pro">PRO</option><option value="institution">Institution</option></select></label><label>Prix XOF<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value ? Number(event.target.value) : '')} placeholder="Ex. 5000" /></label><label>Périodicité<select value={interval} onChange={(event) => setInterval(event.target.value as typeof interval)}><option value="month">Mensuelle</option><option value="year">Annuelle</option><option value="contract">Contrat</option></select></label><label className="agri-billing-checkbox"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> Activer la vente</label><button type="button" onClick={() => void save()}>Enregistrer l’offre</button></div>{message && <p className="agri-billing-admin-message">{message}</p>}</section>;
}
