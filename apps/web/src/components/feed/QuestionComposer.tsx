import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, Image as ImageIcon, Mic, PenLine, Send, Sparkles, Trash2, X } from 'lucide-react';
import { AudioRecorder } from '../emergencies/AudioRecorder';
import { feedCategoryLabels } from '../../data/feed';
import type { FeedCategory } from '../../types/feed';

type QuestionComposerProps = {
  onPublished: (payload: { title: string; body: string; category: FeedCategory; hasVoice: boolean; hasPhoto: boolean; photoName?: string; photoPreview?: string }) => void;
  onClose: () => void;
};

export function QuestionComposer({ onPublished, onClose }: QuestionComposerProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<FeedCategory>('agriculture');
  const [voice, setVoice] = useState<Blob | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    if (!photo) { setPhotoPreview(''); return undefined; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function publish() {
    if (!title.trim() && !body.trim() && !voice) return;
    onPublished({ title: title.trim() || (photo ? 'Diagnostic demandé par photo' : 'Nouvelle question vocale'), body: body.trim() || 'Question transmise depuis le terrain.', category, hasVoice: Boolean(voice), hasPhoto: Boolean(photo), photoName: photo?.name, photoPreview });
    setTitle('');
    setBody('');
    setVoice(null);
    setPhoto(null);
    setMode('text');
  }

  return (
    <section className="ag-feed-composer" aria-label="Nouvelle question">
      <div className="ag-feed-composer-head"><div><span className="ag-feed-section-kicker"><Sparkles className="h-3.5 w-3.5" /> Conseil personnalisé</span><h2>Faites avancer votre situation</h2><p>Donnez quelques repères : un expert certifié pourra vous répondre en français ou en Mooré.</p></div><div className="ag-feed-composer-status"><span><CheckCircle2 className="h-3.5 w-3.5" /> Données protégées</span><button type="button" aria-label="Fermer le formulaire" onClick={onClose}><X className="h-4 w-4" /></button></div></div>
      <div className="ag-feed-compose-mode" role="tablist" aria-label="Type de question"><button type="button" role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'ag-feed-compose-tab-active' : ''} onClick={() => setMode('text')}><PenLine className="h-4 w-4" /> Écrire</button><button type="button" role="tab" aria-selected={mode === 'voice'} className={mode === 'voice' ? 'ag-feed-compose-tab-active' : ''} onClick={() => setMode('voice')}><Mic className="h-4 w-4" /> Parler</button></div>
      <div className="ag-feed-compose-grid"><div><label htmlFor="question-title">Titre de votre question</label><input id="question-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Mes plants de tomate flétrissent" /></div><div><label htmlFor="question-category">Secteur concerné</label><select id="question-category" value={category} onChange={(event) => setCategory(event.target.value as FeedCategory)}>{Object.entries(feedCategoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div>
      {mode === 'text' ? <div className="ag-feed-compose-body"><label htmlFor="question-body">Décrivez votre situation</label><textarea id="question-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Symptômes, date d’apparition, localisation et ce que vous avez déjà essayé…" /><small>Plus votre description est précise, plus la réponse sera directement exploitable sur le terrain.</small></div> : <div className="ag-feed-compose-body"><AudioRecorder onRecordingChange={setVoice} /><small>Votre note vocale sera jointe à la question et pourra être transcrite.</small></div>}
      <div className="ag-feed-photo-capture"><div><span className="ag-feed-photo-icon"><ImageIcon className="h-4 w-4" /></span><div><strong>Ajouter une photo de diagnostic</strong><small>Plante, animal, bassin ou ruche · HD recommandée</small></div></div><label className="ag-feed-photo-button"><Camera className="h-4 w-4" /> {photo ? 'Changer la photo' : 'Prendre une photo'}<input type="file" accept="image/*" capture="environment" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></label></div>
      {photo && <div className="ag-feed-photo-preview">{photoPreview && <img src={photoPreview} alt="Aperçu du diagnostic" />}<ImageIcon className="h-4 w-4" /><span>{photo.name}</span><button type="button" aria-label="Retirer la photo" onClick={() => setPhoto(null)}><Trash2 className="h-3.5 w-3.5" /></button></div>}
      <div className="ag-feed-compose-footer"><span><span className="ag-feed-online-dot" /> 148 experts sont disponibles · photo et brouillon hors-ligne</span><button type="button" className="ag-feed-primary" onClick={publish} disabled={!title.trim() && !body.trim() && !voice && !photo}><Send className="h-4 w-4" /> Publier la question</button></div>
    </section>
  );
}
