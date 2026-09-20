import { useState } from 'react';
import { ArrowLeft, Bug, CheckCircle2, Droplets, HeartPulse, Leaf, LoaderCircle, MapPinned, Send, Siren, Sparkles, Waves } from 'lucide-react';
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
    <div className="animate-slide-in space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <button type="button" className="ag-button-ghost mb-4 -ml-3 px-3 text-xs" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button>
          <p className="ag-section-kicker flex items-center gap-2"><Siren className="h-4 w-4" /> Service prioritaire</p>
          <h1 className="mt-2 text-display-lg text-obsidian-950 dark:text-cream-50">SOS Agropastoral</h1>
          <p className="mt-2 max-w-2xl text-body-lg text-obsidian-600 dark:text-cream-300">Signalez un problème. Votre position sera partagée uniquement avec les professionnels mobilisés.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-danger-50 px-3 py-2 text-xs font-bold text-danger-600 dark:bg-danger-500/10 dark:text-danger-500"><span className="h-2 w-2 animate-pulse-soft rounded-full bg-danger-500" /> Assistance active 24h/24</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="ag-card p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500"><Siren className="h-5 w-5" /></span><div><p className="ag-section-kicker">Étape 1</p><h2 className="ag-section-title">Quel est le problème ?</h2></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {emergencyKinds.map((item) => { const Icon = item.icon; const active = kind === item.key; return <button key={item.key} type="button" onClick={() => setKind(item.key)} className={['rounded-control border p-3 text-left transition duration-200', active ? 'border-danger-500 bg-danger-50 ring-2 ring-danger-500/15 dark:border-danger-500 dark:bg-danger-500/10' : 'border-cream-300 hover:border-territory-300 dark:border-obsidian-700 dark:hover:border-territory-700'].join(' ')} aria-pressed={active}><span className={['flex h-9 w-9 items-center justify-center rounded-lg', active ? 'bg-danger-600 text-white' : 'bg-territory-500/10 text-territory-700 dark:text-territory-300'].join(' ')}><Icon className="h-4 w-4" /></span><span className="mt-3 block text-sm font-bold text-obsidian-900 dark:text-cream-50">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-obsidian-600 dark:text-cream-300">{item.description}</span></button>; })}
            </div>
          </section>

          <section className="ag-card p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700 dark:text-gold-300"><Sparkles className="h-5 w-5" /></span><div><p className="ag-section-kicker">Étape 2</p><h2 className="ag-section-title">Décrivez la situation</h2></div></div>
            <div className="mt-5 space-y-4">
              <div><label className="ag-label" htmlFor="emergency-title">Titre du signalement</label><input id="emergency-title" className="ag-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Plusieurs moutons présentent de la fièvre" required /></div>
              <div><label className="ag-label" htmlFor="emergency-description">Détails utiles <span className="font-normal text-obsidian-600 dark:text-cream-300">(facultatif)</span></label><textarea id="emergency-description" className="ag-input min-h-[112px] resize-y py-3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Depuis quand ? Combien d’animaux ou de parcelles sont concernés ? Quels signes observez-vous ?" /></div>
              <div><p className="ag-label">Niveau de priorité</p><div className="grid grid-cols-3 gap-2">{(['medium', 'high', 'critical'] as Priority[]).map((item) => <button key={item} type="button" onClick={() => setPriority(item)} className={['ag-button min-h-11 border px-2 text-xs', priority === item ? item === 'critical' ? 'border-danger-500 bg-danger-50 text-danger-600 dark:bg-danger-500/10' : 'border-territory-500 bg-territory-50 text-territory-700 dark:bg-territory-500/10 dark:text-territory-300' : 'border-cream-300 text-obsidian-600 dark:border-obsidian-700 dark:text-cream-300'].join(' ')}>{item === 'medium' ? 'Normal' : item === 'high' ? 'Prioritaire' : 'Critique'}</button>)}</div></div>
            </div>
          </section>

          <AudioRecorder onRecordingChange={setAudioRecording} />

          <section className="ag-card p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-500/10 text-medical-600 dark:text-medical-500"><MapPinned className="h-5 w-5" /></span><div><p className="ag-section-kicker">Étape 3</p><h2 className="ag-section-title">Où êtes-vous ?</h2></div></div>
            <p className="mt-3 text-sm leading-6 text-obsidian-600 dark:text-cream-300">La localisation permet de proposer l’expert disponible le plus proche. Elle ne sera pas publiée dans le fil public.</p>
            <button type="button" className="ag-button-secondary mt-4 w-full justify-between" onClick={locateUser} disabled={locating}><span className="flex items-center gap-2"><MapPinned className="h-4 w-4" />{userLocation ? 'Position enregistrée' : 'Utiliser ma position actuelle'}</span>{locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : userLocation ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : null}</button>
            {locationError && <p className="mt-2 text-xs font-medium text-danger-600 dark:text-danger-500">{locationError}</p>}
          </section>

          <button type="submit" className="ag-button-emergency min-h-14 w-full text-base" disabled={!userLocation || !title.trim()}><Send className="h-5 w-5" /> Envoyer le signalement{audioRecording ? ' avec la note vocale' : ''}</button>
          {!userLocation && <p className="text-center text-xs text-obsidian-600 dark:text-cream-300">Activez votre position pour pouvoir transmettre l’urgence.</p>}
        </form>

        <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div><p className="ag-section-kicker">Étape 4 · Mise en relation</p><h2 className="ag-section-title">Experts disponibles autour de vous</h2><p className="mt-2 text-sm text-obsidian-600 dark:text-cream-300">La carte sera recentrée dès que votre position sera autorisée.</p></div>
          <EmergencyMap userLocation={userLocation} onLocate={locateUser} locating={locating} />
          <div className="flex items-start gap-3 rounded-card border border-medical-500/20 bg-medical-50 p-4 dark:bg-medical-500/10"><MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-medical-600 dark:text-medical-500" /><p className="text-xs leading-5 text-medical-600 dark:text-medical-500">Votre signalement sera proposé en priorité aux professionnels certifiés situés dans un rayon de 50 km.</p></div>
        </section>
      </div>
    </div>
  );
}

function EmergencySuccess({ onBack, location }: { onBack: () => void; location: MapPoint | null }) {
  return <div className="mx-auto flex min-h-[65vh] max-w-2xl animate-slide-in items-center justify-center"><div className="ag-card w-full p-6 text-center sm:p-10"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500"><CheckCircle2 className="h-8 w-8" /></span><p className="ag-section-kicker mt-6">Signalement transmis</p><h1 className="mt-2 text-heading-xl text-obsidian-950 dark:text-cream-50">Votre demande est prise en compte</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-obsidian-600 dark:text-cream-300">Un professionnel certifié sera alerté selon la priorité et la distance. Gardez votre téléphone disponible.</p><div className="mx-auto mt-6 max-w-sm rounded-card bg-territory-50 p-4 text-left dark:bg-territory-500/10"><p className="text-[11px] font-bold uppercase tracking-wide text-territory-700 dark:text-territory-300">Référence</p><p className="mt-1 font-mono text-lg font-bold text-territory-900 dark:text-territory-300">SOS-AGRI-092026</p><p className="mt-2 text-xs text-obsidian-600 dark:text-cream-300">{location ? 'Position GPS jointe au dossier' : 'Position approximative utilisée'}</p></div><button type="button" className="ag-button-primary mt-7" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button></div></div>;
}
