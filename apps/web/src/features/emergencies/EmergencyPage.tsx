import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Bug, CheckCircle2, HeartPulse, Leaf, LoaderCircle, MapPinned, Send, ShieldCheck, Siren, Sparkles, Waves } from 'lucide-react';
import { AudioRecorder } from '../../components/emergencies/AudioRecorder';
import { EmergencyMap, type MapPoint } from '../../components/emergencies/EmergencyMap';

type EmergencyKind = 'veterinary' | 'phytosanitary' | 'livestock_epidemic' | 'pest_attack' | 'water_quality';
type Priority = 'medium' | 'high' | 'critical';

const emergencyKinds: Array<{ key: EmergencyKind; label: string; description: string; icon: typeof HeartPulse; tone: string }> = [
  { key: 'veterinary', label: 'Urgence vétérinaire', description: 'Animal malade ou blessé', icon: HeartPulse, tone: 'danger' },
  { key: 'phytosanitary', label: 'Problème de culture', description: 'Maladie ou dépérissement', icon: Leaf, tone: 'green' },
  { key: 'livestock_epidemic', label: 'Épidémie de bétail', description: 'Plusieurs animaux touchés', icon: Bug, tone: 'gold' },
  { key: 'pest_attack', label: 'Attaque de ravageurs', description: 'Insectes ou oiseaux nuisibles', icon: Siren, tone: 'orange' },
  { key: 'water_quality', label: 'Qualité de l’eau', description: 'Pollution ou mortalité aquatique', icon: Waves, tone: 'blue' },
];

export function EmergencyPage({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<EmergencyKind>('veterinary');
  const [priority, setPriority] = useState<Priority>('high');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userLocation, setUserLocation] = useState<MapPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [audioRecording, setAudioRecording] = useState<Blob | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function locateUser() {
    setLocationError(null);
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) return <EmergencySuccess onBack={onBack} location={userLocation} />;

  return (
    <motion.div className="ag-sos-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
      <header className="ag-sos-hero"><div className="ag-sos-hero-orbit ag-sos-orbit-one" /><div className="ag-sos-hero-orbit ag-sos-orbit-two" /><div className="ag-sos-hero-copy"><button type="button" className="ag-sos-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button><div className="ag-sos-eyebrow"><span /> Assistance prioritaire · Burkina Faso</div><h1>Un signal rapide.<br /><em>Une expertise au bon endroit.</em></h1><p>Décrivez l’urgence sur votre exploitation. Nous mobilisons le professionnel certifié le plus proche, selon votre position et le niveau de priorité.</p></div><div className="ag-sos-hero-status"><span className="ag-sos-pulse"><Siren className="h-5 w-5" /></span><div><strong>Cellule SOS active</strong><small>24h/24 · 7j/7</small></div><span className="ag-sos-status-dot" /></div><div className="ag-sos-steps"><span className="ag-sos-step-active"><b>01</b> Décrire</span><i /><span><b>02</b> Localiser</span><i /><span><b>03</b> Mobiliser</span></div></header>

      <div className="ag-sos-alert"><ShieldCheck className="h-4 w-4" /><span><strong>Votre confidentialité est protégée.</strong> Votre position sera transmise uniquement aux professionnels mobilisés pour ce signalement.</span></div>

      <div className="ag-sos-layout">
        <form onSubmit={handleSubmit} className="ag-sos-form">
          <section className="ag-sos-card"><div className="ag-sos-card-head"><span className="ag-sos-card-index ag-sos-index-danger">01</span><div><span className="ag-sos-card-kicker">Nature du signal</span><h2>Quel est le problème ?</h2></div><Siren className="ag-sos-card-mark" /></div><div className="ag-sos-kind-grid">{emergencyKinds.map((item) => { const Icon = item.icon; const active = kind === item.key; return <button key={item.key} type="button" onClick={() => setKind(item.key)} className={['ag-sos-kind', active ? `ag-sos-kind-active ag-sos-kind-${item.tone}` : ''].join(' ')} aria-pressed={active}><span className="ag-sos-kind-icon"><Icon className="h-4 w-4" /></span><span><strong>{item.label}</strong><small>{item.description}</small></span>{active && <CheckCircle2 className="ag-sos-kind-check h-4 w-4" />}</button>; })}</div></section>

          <section className="ag-sos-card"><div className="ag-sos-card-head"><span className="ag-sos-card-index ag-sos-index-gold">02</span><div><span className="ag-sos-card-kicker">Contexte terrain</span><h2>Décrivez la situation</h2></div><Sparkles className="ag-sos-card-mark" /></div><div className="ag-sos-fields"><div><label htmlFor="emergency-title">Titre du signalement</label><input id="emergency-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Plusieurs moutons présentent de la fièvre" required /></div><div><label htmlFor="emergency-description">Détails utiles <small>(facultatif)</small></label><textarea id="emergency-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Depuis quand ? Combien d’animaux ou de parcelles sont concernés ? Quels signes observez-vous ?" /></div><div><label>Niveau de priorité</label><div className="ag-sos-priority-grid">{(['medium', 'high', 'critical'] as Priority[]).map((item) => <button key={item} type="button" onClick={() => setPriority(item)} className={['ag-sos-priority', priority === item ? `ag-sos-priority-active ag-sos-priority-${item}` : ''].join('')} aria-pressed={priority === item}><span />{item === 'medium' ? 'Normal' : item === 'high' ? 'Prioritaire' : 'Critique'}</button>)}</div></div></div></section>

          <section className="ag-sos-card ag-sos-audio-card"><div className="ag-sos-card-head"><span className="ag-sos-card-index ag-sos-index-blue">+</span><div><span className="ag-sos-card-kicker">Parler au terrain</span><h2>Ajoutez une note vocale</h2></div></div><p className="ag-sos-card-intro">Utile si vous êtes en déplacement : décrivez les symptômes dans votre langue la plus confortable.</p><AudioRecorder onRecordingChange={setAudioRecording} /></section>

          <section className="ag-sos-card"><div className="ag-sos-card-head"><span className="ag-sos-card-index ag-sos-index-green">03</span><div><span className="ag-sos-card-kicker">Géolocalisation sécurisée</span><h2>Où êtes-vous ?</h2></div><MapPinned className="ag-sos-card-mark" /></div><p className="ag-sos-card-intro">Nous cherchons le professionnel disponible dans un rayon de 50 km. Cette position ne sera pas publiée dans le fil public.</p><button type="button" className={userLocation ? 'ag-sos-location ag-sos-location-ready' : 'ag-sos-location'} onClick={locateUser} disabled={locating}><span className="ag-sos-location-icon"><MapPinned className="h-4 w-4" /></span><span><strong>{userLocation ? 'Position enregistrée' : 'Utiliser ma position actuelle'}</strong><small>{userLocation ? `${userLocation.lat.toFixed(4)} · ${userLocation.lng.toFixed(4)}` : 'Autorisation requise pour mobiliser l’expert le plus proche'}</small></span>{locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : userLocation ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</button>{locationError && <p className="ag-sos-error">{locationError}</p>}</section>

          <button type="submit" className="ag-sos-submit" disabled={!userLocation || !title.trim()}><Siren className="h-5 w-5" /> Envoyer le signalement {audioRecording && <small>· note vocale jointe</small>}</button>{!userLocation && <p className="ag-sos-submit-hint">Activez votre position pour transmettre l’urgence.</p>}
        </form>

        <aside className="ag-sos-aside"><div className="ag-sos-aside-heading"><span className="ag-sos-card-kicker">04 · Mise en relation</span><h2>Les experts autour de vous</h2><p>La carte se recentre automatiquement dès que votre position est autorisée.</p></div><div className="ag-sos-map-shell"><EmergencyMap userLocation={userLocation} onLocate={locateUser} locating={locating} /></div><div className="ag-sos-expert-queue"><div className="ag-sos-queue-head"><span><i /> Réseau en direct</span><small>3 points actifs</small></div><div className="ag-sos-queue-item"><span className="ag-sos-queue-avatar ag-sos-avatar-gold">AT</span><div><strong>Dr. Adama Traoré</strong><small>Vétérinaire · 2,4 km</small></div><b>En ligne</b></div><div className="ag-sos-queue-item"><span className="ag-sos-queue-avatar ag-sos-avatar-green">AK</span><div><strong>Ing. Awa Kaboré</strong><small>Agronomie · 4,8 km</small></div><b>Disponible</b></div></div><div className="ag-sos-reassurance"><ShieldCheck className="h-4 w-4" /><span>Votre signalement sera proposé en priorité aux professionnels certifiés.</span></div></aside>
      </div>
    </motion.div>
  );
}

function EmergencySuccess({ onBack, location }: { onBack: () => void; location: MapPoint | null }) {
  return <motion.div className="ag-sos-success" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}><div className="ag-sos-success-orbit" /><span className="ag-sos-success-icon"><CheckCircle2 className="h-9 w-9" /></span><span className="ag-sos-card-kicker">Signalement transmis</span><h1>Votre demande est prise en compte.</h1><p>La cellule SOS va mobiliser un professionnel certifié selon la priorité et la distance. Gardez votre téléphone disponible.</p><div className="ag-sos-reference"><span>Référence de suivi</span><strong>SOS-AGRI-092026</strong><small>{location ? 'Position GPS jointe au dossier' : 'Position approximative utilisée'}</small></div><button type="button" className="ag-sos-success-button" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button></motion.div>;
}
