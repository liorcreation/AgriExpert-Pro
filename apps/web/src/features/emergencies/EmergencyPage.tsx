import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bug, CheckCircle2, HeartPulse, Leaf, LoaderCircle, MapPinned, Radio, Send, ShieldCheck, Siren, Sparkles, Waves } from 'lucide-react';
import { AudioRecorder } from '../../components/emergencies/AudioRecorder';
import { EmergencyMap, type MapPoint } from '../../components/emergencies/EmergencyMap';
import type { UserRole } from '../../types/shell';
import { createEmergency, getEmergencyAvailability, getInstitutionalDashboard, isApiConfigured, listEmergencies, listEmergencyExperts, updateEmergency, updateEmergencyAvailability, uploadMedia, type EmergencyExpert, type InstitutionalDashboardData, type PersistedEmergency } from '../../lib/api';

type EmergencyKind = 'veterinary' | 'phytosanitary' | 'livestock_epidemic' | 'pest_attack' | 'water_quality';
type Priority = 'medium' | 'high' | 'critical';

const emergencyKinds: Array<{ key: EmergencyKind; label: string; description: string; icon: typeof HeartPulse; tone: string }> = [
  { key: 'veterinary', label: 'Urgence vétérinaire', description: 'Animal malade ou blessé', icon: HeartPulse, tone: 'danger' },
  { key: 'phytosanitary', label: 'Problème de culture', description: 'Maladie ou dépérissement', icon: Leaf, tone: 'green' },
  { key: 'livestock_epidemic', label: 'Épidémie de bétail', description: 'Plusieurs animaux touchés', icon: Bug, tone: 'gold' },
  { key: 'pest_attack', label: 'Attaque de ravageurs', description: 'Insectes ou oiseaux nuisibles', icon: Siren, tone: 'orange' },
  { key: 'water_quality', label: 'Qualité de l’eau', description: 'Pollution ou mortalité aquatique', icon: Waves, tone: 'blue' },
];

export function EmergencyPage({ role, onBack }: { role: UserRole; onBack: () => void }) {
  const [kind, setKind] = useState<EmergencyKind>('veterinary');
  const [priority, setPriority] = useState<Priority>('high');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userLocation, setUserLocation] = useState<MapPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationConsent, setLocationConsent] = useState(false);
  const [audioConsent, setAudioConsent] = useState(false);
  const [audioRecording, setAudioRecording] = useState<Blob | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reference, setReference] = useState('SOS-AGRI-LOCAL');
  const [history, setHistory] = useState<PersistedEmergency[]>([]);
  const [nearbyExperts, setNearbyExperts] = useState<EmergencyExpert[]>([]);

  useEffect(() => {
    if (isApiConfigured) void listEmergencies().then((response) => setHistory(response.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isApiConfigured || !userLocation) { setNearbyExperts([]); return; }
    void listEmergencyExperts(userLocation.lat, userLocation.lng, kind).then((response) => setNearbyExperts(response.data)).catch(() => setNearbyExperts([]));
  }, [kind, userLocation]);

  function locateUser() {
    setLocationError(null);
    if (!locationConsent) {
      setLocationError('Confirmez d’abord l’utilisation de votre position pour ce signalement.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError('Position indisponible. Vérifiez l’autorisation de localisation puis réessayez.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isApiConfigured && userLocation) {
      setIsSubmitting(true);
      setSubmitError('');
      try {
        const audio = audioRecording ? await uploadMedia(audioRecording, 'voice', 'sos-note.webm', undefined, audioConsent) : null;
        const response = await createEmergency({ kind, title: title.trim(), description: description.trim(), priority, latitude: userLocation.lat, longitude: userLocation.lng, locationConsent, attachmentIds: audio ? [audio.data.id] : [] });
        setReference(response.data.reference);
        setHistory((current) => [{ id: response.data.id, reference: response.data.reference, kind, title: title.trim(), description: description.trim(), priority, latitude: userLocation.lat, longitude: userLocation.lng, status: response.data.status, created_at: new Date().toISOString() }, ...current]);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Le signalement n’a pas pu être transmis.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }
    setSubmitted(true);
  }

  if (role === 'expert') return <ExpertEmergencyLiveWorkspace onBack={onBack} />;
  if (role === 'institution') return <InstitutionEmergencyWorkspace onBack={onBack} />;

  if (submitted) return <EmergencySuccess onBack={onBack} location={userLocation} reference={reference} />;

  return (
    <motion.div className="ag-sos-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
      <header className="ag-sos-hero"><div className="ag-sos-hero-orbit ag-sos-orbit-one" /><div className="ag-sos-hero-orbit ag-sos-orbit-two" /><div className="ag-sos-hero-copy"><button type="button" className="ag-sos-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button><div className="ag-sos-eyebrow"><span /> Canal de signalement · Burkina Faso</div><h1>Un signal rapide.<br /><em>Une expertise au bon endroit.</em></h1><p>Décrivez l’urgence sur votre exploitation. Le serveur cherche un expert déclaré disponible, dans son rayon réel, puis conserve chaque étape du dossier.</p></div><div className="ag-sos-hero-status"><span className="ag-sos-pulse"><Siren className="h-5 w-5" /></span><div><strong>Signalement opérationnel</strong><small>Attribution selon disponibilité</small></div><span className="ag-sos-status-dot" /></div><div className="ag-sos-steps"><span className="ag-sos-step-active"><b>01</b> Décrire</span><i /><span><b>02</b> Localiser</span><i /><span><b>03</b> Mobiliser</span></div></header>

      <div className="ag-sos-alert"><ShieldCheck className="h-4 w-4" /><span><strong>À propos de votre position.</strong> Elle est liée au dossier SOS et visible des professionnels autorisés à le traiter. Ce canal ne remplace pas les services d’urgence officiels : appelez les autorités ou un vétérinaire de garde si la situation présente un danger immédiat.</span></div>

      <div className="ag-sos-layout">
        <form onSubmit={handleSubmit} className="ag-sos-form">
          <section className="ag-sos-card"><div className="ag-sos-card-head"><span className="ag-sos-card-index ag-sos-index-danger">01</span><div><span className="ag-sos-card-kicker">Nature du signal</span><h2>Quel est le problème ?</h2></div><Siren className="ag-sos-card-mark" /></div><div className="ag-sos-kind-grid">{emergencyKinds.map((item) => { const Icon = item.icon; const active = kind === item.key; return <button key={item.key} type="button" onClick={() => setKind(item.key)} className={['ag-sos-kind', active ? `ag-sos-kind-active ag-sos-kind-${item.tone}` : ''].join(' ')} aria-pressed={active}><span className="ag-sos-kind-icon"><Icon className="h-4 w-4" /></span><span><strong>{item.label}</strong><small>{item.description}</small></span>{active && <CheckCircle2 className="ag-sos-kind-check h-4 w-4" />}</button>; })}</div></section>

          <section className="ag-sos-card"><div className="ag-sos-card-head"><span className="ag-sos-card-index ag-sos-index-gold">02</span><div><span className="ag-sos-card-kicker">Contexte terrain</span><h2>Décrivez la situation</h2></div><Sparkles className="ag-sos-card-mark" /></div><div className="ag-sos-fields"><div><label htmlFor="emergency-title">Titre du signalement</label><input id="emergency-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Plusieurs moutons présentent de la fièvre" required /></div><div><label htmlFor="emergency-description">Détails utiles <small>(facultatif)</small></label><textarea id="emergency-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Depuis quand ? Combien d’animaux ou de parcelles sont concernés ? Quels signes observez-vous ?" /></div><div><span id="emergency-priority-label" className="ag-sos-priority-label">Niveau de priorité</span><div className="ag-sos-priority-grid" role="group" aria-labelledby="emergency-priority-label">{(['medium', 'high', 'critical'] as Priority[]).map((item) => <button key={item} type="button" onClick={() => setPriority(item)} className={['ag-sos-priority', priority === item ? `ag-sos-priority-active ag-sos-priority-${item}` : ''].join('')} aria-pressed={priority === item}><span aria-hidden="true" />{item === 'medium' ? 'Normal' : item === 'high' ? 'Prioritaire' : 'Critique'}</button>)}</div></div></div></section>

          <section className="ag-sos-card ag-sos-audio-card"><div className="ag-sos-card-head"><span className="ag-sos-card-index ag-sos-index-blue">+</span><div><span className="ag-sos-card-kicker">Parler au terrain</span><h2>Ajoutez une note vocale</h2></div></div><p className="ag-sos-card-intro">Utile si vous êtes en déplacement : décrivez les symptômes dans votre langue la plus confortable.</p><AudioRecorder onRecordingChange={(recording) => { setAudioRecording(recording); if (!recording) setAudioConsent(false); }} />{audioRecording && <label className="ag-sos-consent"><input type="checkbox" checked={audioConsent} onChange={(event) => setAudioConsent(event.target.checked)} /><span>J’accepte que cette note vocale soit envoyée avec mon signalement et partagée avec les experts affectés à ce dossier.</span></label>}</section>

          <section className="ag-sos-card"><div className="ag-sos-card-head"><span className="ag-sos-card-index ag-sos-index-green">03</span><div><span className="ag-sos-card-kicker">Géolocalisation sécurisée</span><h2>Où êtes-vous ?</h2></div><MapPinned className="ag-sos-card-mark" /></div><p className="ag-sos-card-intro">La position précise sera enregistrée avec votre dossier et utilisée pour rechercher un expert proche. Elle ne sera pas publiée dans le fil public.</p><label className="ag-sos-consent"><input type="checkbox" checked={locationConsent} onChange={(event) => setLocationConsent(event.target.checked)} /><span>J’autorise l’accès à ma position et son envoi avec ce signalement. Je peux refuser et quitter le parcours SOS.</span></label><button type="button" className={userLocation ? 'ag-sos-location ag-sos-location-ready' : 'ag-sos-location'} onClick={locateUser} disabled={locating || !locationConsent}><span className="ag-sos-location-icon"><MapPinned className="h-4 w-4" /></span><span><strong>{userLocation ? 'Position enregistrée' : 'Utiliser ma position actuelle'}</strong><small>{userLocation ? `${userLocation.lat.toFixed(4)} · ${userLocation.lng.toFixed(4)}` : locationConsent ? 'Votre navigateur demandera ensuite l’autorisation de localisation' : 'Donnez votre accord pour continuer'}</small></span>{locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : userLocation ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</button>{locationError && <p className="ag-sos-error">{locationError}</p>}</section>

          <button type="submit" className="ag-sos-submit" disabled={!userLocation || !title.trim() || (Boolean(audioRecording) && !audioConsent) || isSubmitting}><Siren className="h-5 w-5" /> {isSubmitting ? 'Transmission en cours…' : 'Envoyer le signalement'} {audioRecording && <small>· note vocale jointe</small>}</button>{!userLocation && <p className="ag-sos-submit-hint">Accordez la position puis activez-la pour transmettre l’urgence.</p>}{submitError && <p className="ag-sos-error" role="alert">{submitError}</p>}
        </form>

        <aside className="ag-sos-aside"><div className="ag-sos-aside-heading"><span className="ag-sos-card-kicker">04 · Mise en relation</span><h2>Les experts autour de vous</h2><p>La carte affiche uniquement les experts déclarés disponibles récemment et dans leur rayon configuré.</p></div><div className="ag-sos-map-shell"><EmergencyMap userLocation={userLocation} experts={nearbyExperts} onLocate={locateUser} locating={locating} /></div><div className="ag-sos-expert-queue"><div className="ag-sos-queue-head"><span><i /> Disponibilités serveur</span><small>{nearbyExperts.length} point{nearbyExperts.length > 1 ? 's' : ''} actif{nearbyExperts.length > 1 ? 's' : ''}</small></div>{nearbyExperts.slice(0, 3).map((expert) => <div className="ag-sos-queue-item" key={expert.id}><span className="ag-sos-queue-avatar ag-sos-avatar-green">{expert.name.split(' ').map((item) => item[0]).join('').slice(0, 2)}</span><div><strong>{expert.name}</strong><small>{expert.specialty} · {expert.distance_km.toFixed(1)} km</small></div><b>Disponible</b></div>)}{!nearbyExperts.length && <p className="ag-sos-empty-state">Activez la position pour voir les disponibilités réelles autour de vous.</p>}</div><div className="ag-sos-reassurance"><ShieldCheck className="h-4 w-4" /><span>Le serveur proposera le signalement à l’expert certifié le plus proche et escaladera si le délai expire.</span></div><div className="ag-sos-history"><div className="ag-sos-queue-head"><span>Votre historique SOS</span><small>{history.length} signalement{history.length > 1 ? 's' : ''}</small></div>{history.length ? history.slice(0, 3).map((item) => <div className="ag-sos-history-item" key={item.id}><strong>{item.title}</strong><small>{item.reference} · {item.status === 'open' ? 'Ouvert' : item.status}</small></div>) : <p>Aucun signalement enregistré pour le moment.</p>}</div></aside>
      </div>
    </motion.div>
  );
}

function ExpertEmergencyWorkspace({ onBack }: { onBack: () => void }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  useEffect(() => { if (isApiConfigured) void getEmergencyAvailability().then((response) => setIsAvailable(Boolean(response.data.is_available))).catch(() => undefined); }, []);
  async function toggleAvailability() {
    setIsUpdatingAvailability(true); setAvailabilityError('');
    try {
      if (isAvailable) { await updateEmergencyAvailability({ isAvailable: false }); setIsAvailable(false); }
      else {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }));
        await updateEmergencyAvailability({ isAvailable: true, latitude: position.coords.latitude, longitude: position.coords.longitude, radiusKm: 50 });
        setIsAvailable(true);
      }
    } catch { setAvailabilityError('Autorisez la position pour activer une disponibilité réelle.'); }
    finally { setIsUpdatingAvailability(false); }
  }
  return <motion.div className="agri-role-page agri-sos-role-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}><header className="agri-role-page-hero agri-role-page-hero-danger"><div><button type="button" className="agri-role-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour à mon espace expert</button><div className="agri-role-eyebrow"><span /> Cellule d’intervention · Priorités terrain</div><h1>Chaque minute compte.<br /><em>Mobilisez le bon renfort.</em></h1><p>Retrouvez les signalements qui vous sont attribués, confirmez votre disponibilité et transmettez un premier retour au producteur.</p></div><div className="agri-role-hero-orb agri-role-hero-orb-danger"><Siren className="h-7 w-7" /><strong>4</strong><span>interventions urgentes</span></div></header><div className="agri-role-stat-grid"><RoleEmergencyStat label="À prendre en charge" value="4" detail="2 critiques" tone="red" /><RoleEmergencyStat label="Temps de prise en charge" value="7 min" detail="objectif · 10 min" tone="gold" /><RoleEmergencyStat label="Interventions ce mois" value="38" detail="+12% d’activité" tone="blue" /><RoleEmergencyStat label="Résolution sur site" value="86%" detail="sur 74 interventions" tone="green" /></div><div className="agri-role-work-grid"><section className="agri-role-work-card"><div className="agri-role-card-head"><div><span>File d’intervention</span><h2>Les urgences proches de vous</h2></div><span className="agri-role-live agri-role-live-danger"><i /> 4 actives</span></div><ExpertEmergencyItem title="Suspicion de maladie aviaire" detail="Kaya · 18 volailles touchées · il y a 24 min" tag="Critique" tone="red" /><ExpertEmergencyItem title="Fièvre sur un troupeau ovin" detail="Koubri · 2,4 km · il y a 41 min" tag="Prioritaire" tone="gold" /><ExpertEmergencyItem title="Mortalité piscicole" detail="Bobo-Dioulasso · 6,8 km · il y a 1 h" tag="À confirmer" tone="blue" /><button type="button" className="agri-role-card-link">Ouvrir la carte des interventions <ArrowRight className="h-4 w-4" /></button></section><aside className="agri-role-work-card agri-role-work-card-dark"><div className="agri-role-card-head"><div><span>Votre disponibilité</span><h2>Prêt à intervenir</h2></div><CheckCircle2 className="h-5 w-5" /></div><div className="agri-sos-availability"><div className="agri-sos-availability-orbit"><Siren className="h-6 w-6" /></div><strong>En ligne</strong><small>Votre zone : Ouagadougou · 50 km</small><button type="button">Modifier ma zone <ArrowUpRight className="h-4 w-4" /></button></div></aside></div></motion.div>;
}

function ExpertEmergencyLiveWorkspace({ onBack }: { onBack: () => void }) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cases, setCases] = useState<PersistedEmergency[]>([]);
  const [loading, setLoading] = useState(isApiConfigured);
  const [updatingCase, setUpdatingCase] = useState<number | null>(null);
  const [error, setError] = useState('');
  async function refreshCases() {
    if (!isApiConfigured) { setLoading(false); setError('Le service SOS n’est pas configuré sur cet environnement.'); return; }
    setLoading(true); setError('');
    try { const response = await listEmergencies(); setCases(response.data); }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Impossible de charger les interventions attribuées.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!isApiConfigured) return;
    void refreshCases();
    void getEmergencyAvailability().then((response) => setIsAvailable(Boolean(response.data.is_available))).catch(() => setIsAvailable(null));
  }, []);
  async function handleCaseAction(id: number, action: 'accept' | 'decline' | 'resolve') {
    setUpdatingCase(id); setError('');
    try {
      await updateEmergency(id, action);
      if (action === 'decline' || action === 'resolve') setCases((current) => current.filter((item) => item.id !== id));
      else await refreshCases();
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Cette action n’a pas pu être enregistrée. Actualisez la file puis réessayez.'); }
    finally { setUpdatingCase(null); }
  }
  async function toggle() {
    setIsUpdating(true); setError('');
    try {
      if (isAvailable) { await updateEmergencyAvailability({ isAvailable: false }); setIsAvailable(false); }
      else {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }));
        await updateEmergencyAvailability({ isAvailable: true, latitude: position.coords.latitude, longitude: position.coords.longitude, radiusKm: 50 });
        setIsAvailable(true);
      }
    } catch { setError('Autorisez la position pour activer une disponibilité réelle.'); }
    finally { setIsUpdating(false); }
  }
  const criticalCount = cases.filter((item) => item.priority === 'critical').length;
  return <motion.div className="agri-role-page agri-sos-role-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
    <header className="agri-role-page-hero agri-role-page-hero-danger"><div><button type="button" className="agri-role-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour à mon espace expert</button><div className="agri-role-eyebrow"><span /> Cellule d’intervention · Priorités terrain</div><h1>Chaque minute compte.<br /><em>Mobilisez le bon renfort.</em></h1><p>Consultez les signalements attribués par le serveur, confirmez votre prise en charge et tenez votre disponibilité à jour.</p></div><div className="agri-role-hero-orb agri-role-hero-orb-danger"><Siren className="h-7 w-7" /><strong>{loading ? '…' : cases.length}</strong><span>intervention{cases.length > 1 ? 's' : ''} attribuée{cases.length > 1 ? 's' : ''}</span></div></header>
    {error && <div className="agri-expert-error" role="alert">{error}</div>}
    <div className="agri-role-stat-grid"><RoleEmergencyStat label="Disponibilité serveur" value={isAvailable === null ? 'À vérifier' : isAvailable ? 'Active' : 'Inactive'} detail="position partagée pour l’attribution" tone={isAvailable ? 'green' : 'red'} /><RoleEmergencyStat label="Interventions attribuées" value={loading ? '—' : String(cases.length)} detail="dossiers visibles par vous" tone="gold" /><RoleEmergencyStat label="Priorité critique" value={loading ? '—' : String(criticalCount)} detail="parmi vos interventions" tone="red" /><RoleEmergencyStat label="Actions possibles" value={loading ? '—' : String(cases.filter((item) => item.assignment_status === 'offered' || item.assignment_status === 'accepted').length)} detail="accepter, décliner ou résoudre" tone="blue" /></div>
    <div className="agri-role-work-grid"><section className="agri-role-work-card"><div className="agri-role-card-head"><div><span>File d’intervention · données serveur</span><h2>Les urgences qui vous sont attribuées</h2></div><button type="button" className="agri-role-card-link" onClick={() => void refreshCases()} disabled={loading}><Radio className="h-4 w-4" /> {loading ? 'Actualisation…' : 'Actualiser'}</button></div>
      {loading ? <div className="agri-role-empty" role="status"><LoaderCircle className="h-6 w-6 animate-spin" /><strong>Chargement des interventions</strong><span>Récupération des dossiers attribués à votre compte.</span></div> : cases.length ? <div className="agri-emergency-assigned-list">{cases.map((item) => {
        const offered = item.assignment_status === 'offered';
        const statusLabel = offered ? 'À confirmer' : item.status === 'resolved' ? 'Résolue' : 'Prise en charge';
        const tone = item.priority === 'critical' ? 'red' : item.priority === 'high' ? 'gold' : 'blue';
        return <article className={`agri-emergency-assigned-card agri-emergency-assigned-${tone}`} key={item.id}><div className="agri-emergency-assigned-meta"><span><i />{item.priority === 'critical' ? 'Critique' : item.priority === 'high' ? 'Prioritaire' : 'Normale'}</span><b>{statusLabel}</b></div><h3>{item.title}</h3><p>{item.description || 'Aucun détail complémentaire fourni.'}</p><div className="agri-emergency-assigned-details"><span>{item.reference}</span><span>{new Date(item.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>{item.assignment_distance_km != null && <span>{item.assignment_distance_km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km</span>}</div><div className="agri-emergency-assigned-actions">{offered ? <><button type="button" onClick={() => void handleCaseAction(item.id, 'accept')} disabled={updatingCase === item.id}>{updatingCase === item.id ? 'Enregistrement…' : 'Accepter la mission'}</button><button type="button" onClick={() => void handleCaseAction(item.id, 'decline')} disabled={updatingCase === item.id}>Décliner</button></> : <button type="button" onClick={() => void handleCaseAction(item.id, 'resolve')} disabled={updatingCase === item.id}>{updatingCase === item.id ? 'Enregistrement…' : 'Marquer comme résolue'}</button>}</div></article>;
      })}</div> : <div className="agri-role-empty"><CheckCircle2 className="h-6 w-6" /><strong>Aucune intervention attribuée</strong><span>Les nouveaux dossiers apparaîtront ici dès qu’une demande vous sera proposée.</span></div>}</section>
      <aside className="agri-role-work-card agri-role-work-card-dark"><div className="agri-role-card-head"><div><span>Votre disponibilité</span><h2>{isAvailable ? 'Vous êtes mobilisable' : 'Vous êtes hors ligne'}</h2></div><CheckCircle2 className="h-5 w-5" /></div><div className="agri-sos-availability"><div className="agri-sos-availability-orbit"><Siren className="h-6 w-6" /></div><strong>{isAvailable ? 'En ligne' : 'Hors ligne'}</strong><small>Votre position précise sert uniquement au calcul de proximité des urgences.</small><button type="button" onClick={() => void toggle()} disabled={isUpdating}>{isUpdating ? 'Mise à jour…' : isAvailable ? 'Me mettre hors ligne' : 'Activer ma disponibilité'} <ArrowUpRight className="h-4 w-4" /></button></div></aside></div>
  </motion.div>;
}

function InstitutionEmergencyWorkspace({ onBack }: { onBack: () => void }) {
  const [dashboard, setDashboard] = useState<InstitutionalDashboardData | null>(null);
  const [loading, setLoading] = useState(isApiConfigured);
  const [error, setError] = useState('');
  async function refresh() {
    if (!isApiConfigured) { setLoading(false); setError('Le service institutionnel n’est pas configuré dans cet environnement.'); return; }
    setLoading(true); setError('');
    try { const response = await getInstitutionalDashboard('7d', 'national'); setDashboard(response.data); }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'La veille sanitaire est momentanément indisponible.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const alerts = dashboard?.alerts ?? [];
  const criticalCount = dashboard?.kpis.criticalAlerts ?? 0;
  const updatedAt = dashboard ? new Date(dashboard.lastUpdated).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  return <motion.div className="agri-role-page agri-sos-role-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
    <header className="agri-role-page-hero agri-role-page-hero-danger"><div><button type="button" className="agri-role-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour à la supervision</button><div className="agri-role-eyebrow"><span /> Veille sanitaire · {dashboard?.scope.institutionName ?? 'Périmètre institutionnel'}</div><h1>Prévenir l’impact.<br /><em>Coordonner la réponse.</em></h1><p>Alertes agrégées et données du périmètre auquel votre institution est autorisée à accéder.</p></div><div className="agri-role-hero-orb agri-role-hero-orb-danger"><ShieldCheck className="h-7 w-7" /><strong>{loading ? '…' : dashboard?.kpis.activeAlerts ?? '—'}</strong><span>alertes actives · 7 jours</span></div></header>
    {error && <div className="agri-expert-error" role="alert">{error}</div>}
    <div className="agri-role-stat-grid"><RoleEmergencyStat label="Alertes critiques" value={loading ? '—' : String(criticalCount)} detail="parmi les signalements actifs" tone="red" /><RoleEmergencyStat label="Alertes actives" value={loading ? '—' : String(dashboard?.kpis.activeAlerts ?? 0)} detail="sur les 7 derniers jours" tone="gold" /><RoleEmergencyStat label="Experts disponibles" value={loading ? '—' : String(dashboard?.kpis.availableExperts ?? 0)} detail="présence récente confirmée" tone="blue" /><RoleEmergencyStat label="Demandes du territoire" value={loading ? '—' : String(dashboard?.kpis.totalRequests ?? 0)} detail="sur la même période" tone="green" /></div>
    <div className="agri-role-work-grid"><section className="agri-role-work-card"><div className="agri-role-card-head"><div><span>Centre de coordination · données agrégées</span><h2>Alertes nécessitant une attention</h2>{updatedAt && <small className="agri-institutional-source-note">Actualisé le {updatedAt}</small>}</div><button type="button" className="agri-role-card-link" onClick={() => void refresh()} disabled={loading}><Radio className="h-4 w-4" /> {loading ? 'Actualisation…' : 'Actualiser'}</button></div>
      {loading ? <div className="agri-role-empty" role="status"><LoaderCircle className="h-6 w-6 animate-spin" /><strong>Chargement de la veille</strong><span>Récupération des indicateurs de votre périmètre institutionnel.</span></div> : alerts.length ? <div className="agri-institution-emergency-list">{alerts.map((alert, index) => <article className={`agri-institution-emergency-item agri-institution-emergency-${alert.level}`} key={`${alert.title}-${alert.region}-${index}`}><span className="agri-institution-emergency-level"><i />{alert.level === 'critical' ? 'Critique' : alert.level === 'high' ? 'Prioritaire' : 'Surveillance'}</span><div><strong>{alert.title}</strong><small>{alert.region} · {alert.count}</small></div><time>{alert.time}</time></article>)}</div> : <div className="agri-role-empty"><CheckCircle2 className="h-6 w-6" /><strong>Aucune alerte active agrégée</strong><span>Aucun signalement répondant aux critères d’affichage n’est disponible sur cette période et ce périmètre.</span></div>}</section>
      <aside className="agri-role-work-card agri-role-work-card-dark"><div className="agri-role-card-head"><div><span>Capacité de réponse</span><h2>Réseau mobilisable</h2></div><Radio className="h-5 w-5" /></div><div className="agri-sos-capacity"><div><strong>{loading ? '—' : dashboard?.kpis.availableExperts ?? 0}</strong><span>experts disponibles</span></div><div><strong>{loading ? '—' : dashboard?.kpis.averageResponseMinutes ? `${dashboard.kpis.averageResponseMinutes} min` : '—'}</strong><span>délai moyen mesuré</span></div><div><strong>{loading ? '—' : `${dashboard?.coverage.territoriesCovered ?? 0}%`}</strong><span>territoires couverts</span></div></div><p className="agri-sos-institution-note">Les indicateurs reflètent le périmètre autorisé et la période des 7 derniers jours.</p></aside></div>
  </motion.div>;
}

function RoleEmergencyStat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) { return <div className={`agri-role-stat agri-role-stat-${tone}`}><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>; }
function ExpertEmergencyItem({ title, detail, tag, tone }: { title: string; detail: string; tag: string; tone: string }) { return <button type="button" className={`agri-role-queue agri-role-queue-${tone}`}><span><i />{tag}</span><div><strong>{title}</strong><small>{detail}</small></div><ArrowRight className="h-4 w-4" /></button>; }
function EmergencySuccess({ onBack, location, reference }: { onBack: () => void; location: MapPoint | null; reference: string }) {
  return <motion.div className="ag-sos-success" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}><div className="ag-sos-success-orbit" /><span className="ag-sos-success-icon"><CheckCircle2 className="h-9 w-9" /></span><span className="ag-sos-card-kicker">Signalement enregistré</span><h1>Votre dossier est bien transmis.</h1><p>Un expert disponible peut être sollicité selon sa zone et son délai de réponse. Gardez votre téléphone disponible; en cas de danger immédiat, contactez les services d’urgence officiels.</p><div className="ag-sos-reference"><span>Référence de suivi</span><strong>{reference}</strong><small>{location ? 'Position GPS jointe au dossier' : 'Position approximative utilisée'}</small></div><button type="button" className="ag-sos-success-button" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button></motion.div>;
}
