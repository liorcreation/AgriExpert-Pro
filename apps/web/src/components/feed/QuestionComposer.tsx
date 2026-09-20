import { useState } from 'react';
import { ImagePlus, Mic, PenLine, Send } from 'lucide-react';
import { AudioRecorder } from '../emergencies/AudioRecorder';
import { feedCategoryLabels } from '../../data/feed';
import type { FeedCategory } from '../../types/feed';

type QuestionComposerProps = {
  onPublished: (payload: { title: string; body: string; category: FeedCategory; hasVoice: boolean }) => void;
};

export function QuestionComposer({ onPublished }: QuestionComposerProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<FeedCategory>('agriculture');
  const [voice, setVoice] = useState<Blob | null>(null);

  function publish() {
    if (!title.trim() && !body.trim() && !voice) return;
    onPublished({ title: title.trim() || 'Nouvelle question vocale', body: body.trim() || 'Question transmise par note vocale.', category, hasVoice: Boolean(voice) });
    setTitle('');
    setBody('');
    setVoice(null);
    setMode('text');
  }

  return (
    <section className="ag-card p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="ag-section-kicker">Besoin d’un conseil ?</p><h2 className="ag-section-title">Posez votre question à la communauté</h2><p className="mt-2 text-sm text-obsidian-600 dark:text-cream-300">Un technicien certifié peut vous répondre en français ou en Mooré.</p></div><span className="ag-badge-online">148 experts en ligne</span></div>
      <div className="mt-5 flex gap-1 rounded-control bg-cream-100 p-1 dark:bg-obsidian-800"><button type="button" onClick={() => setMode('text')} className={['ag-button min-h-10 flex-1 text-xs', mode === 'text' ? 'bg-cream-50 text-territory-900 shadow-soft dark:bg-obsidian-700 dark:text-territory-300' : 'text-obsidian-600 dark:text-cream-300'].join(' ')}><PenLine className="h-4 w-4" /> Écrire</button><button type="button" onClick={() => setMode('voice')} className={['ag-button min-h-10 flex-1 text-xs', mode === 'voice' ? 'bg-cream-50 text-territory-900 shadow-soft dark:bg-obsidian-700 dark:text-territory-300' : 'text-obsidian-600 dark:text-cream-300'].join(' ')}><Mic className="h-4 w-4" /> Parler</button></div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_190px]"><div><label className="ag-label" htmlFor="question-title">Titre de votre question</label><input id="question-title" className="ag-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Mes plants de tomate flétrissent" /></div><div><label className="ag-label" htmlFor="question-category">Secteur</label><select id="question-category" className="ag-input" value={category} onChange={(event) => setCategory(event.target.value as FeedCategory)}>{Object.entries(feedCategoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div>
      {mode === 'text' ? <div className="mt-4"><label className="ag-label" htmlFor="question-body">Décrivez votre situation</label><textarea id="question-body" className="ag-input min-h-[118px] resize-y py-3" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Ajoutez les symptômes, la date d’apparition et ce que vous avez déjà essayé…" /><div className="mt-2 flex items-center gap-2 text-xs text-obsidian-600 dark:text-cream-300"><button type="button" className="ag-button-ghost min-h-8 px-2 text-[11px]"><ImagePlus className="h-4 w-4" /> Ajouter une photo</button><span>ou passez en mode vocal pour parler librement.</span></div></div> : <div className="mt-4"><AudioRecorder onRecordingChange={setVoice} /><p className="mt-2 text-xs text-obsidian-600 dark:text-cream-300">La note pourra être transcrite automatiquement et relue par un expert.</p></div>}
      <div className="mt-5 flex flex-col-reverse justify-between gap-3 border-t border-cream-300/70 pt-4 sm:flex-row sm:items-center dark:border-obsidian-700"><p className="text-xs text-obsidian-600 dark:text-cream-300">Vos coordonnées précises restent privées.</p><button type="button" className="ag-button-primary" onClick={publish} disabled={!title.trim() && !body.trim() && !voice}><Send className="h-4 w-4" /> Publier la question</button></div>
    </section>
  );
}
