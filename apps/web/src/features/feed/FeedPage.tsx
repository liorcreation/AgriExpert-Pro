import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Filter, Flame, HelpCircle, MessageCircle, Mic, Plus, Search, UsersRound } from 'lucide-react';
import { initialQuestions, feedCategoryLabels } from '../../data/feed';
import { QuestionCard } from '../../components/feed/QuestionCard';
import { QuestionComposer } from '../../components/feed/QuestionComposer';
import type { FeedCategory, FeedQuestion } from '../../types/feed';

type FeedFilter = 'all' | FeedCategory;

export function FeedPage({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [search, setSearch] = useState('');
  const [questions, setQuestions] = useState(initialQuestions);
  const [composerOpen, setComposerOpen] = useState(false);

  const visibleQuestions = useMemo(() => questions.filter((question) => {
    const matchesFilter = filter === 'all' || question.category === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${question.title} ${question.body}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  }), [filter, questions, search]);

  function addQuestion(payload: { title: string; body: string; category: FeedCategory; hasVoice: boolean }) {
    const newQuestion: FeedQuestion = { id: `question-${Date.now()}`, ...payload, authorName: 'Steve D.', authorLocation: 'Votre exploitation', createdAt: 'À l’instant', answerCount: 0 };
    setQuestions((current) => [newQuestion, ...current]);
    setComposerOpen(false);
  }

  return (
    <div className="animate-slide-in space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><button type="button" className="ag-button-ghost mb-4 -ml-3 px-3 text-xs" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button><p className="ag-section-kicker flex items-center gap-2"><UsersRound className="h-4 w-4" /> Conseil communautaire</p><h1 className="mt-2 text-display-lg text-obsidian-950 dark:text-cream-50">Fil d’échanges technique</h1><p className="mt-2 max-w-2xl text-body-lg text-obsidian-600 dark:text-cream-300">Des réponses de terrain, vérifiées par des spécialistes qui connaissent vos réalités.</p></div><button type="button" className="ag-button-primary w-fit" onClick={() => setComposerOpen((current) => !current)}><Plus className="h-4 w-4" /> Poser une question</button></div>

      {composerOpen && <QuestionComposer onPublished={addQuestion} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <div className="ag-card p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2 overflow-x-auto pb-1"><Filter className="h-4 w-4 shrink-0 text-obsidian-600 dark:text-cream-300" /><FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Tout</FilterChip>{(Object.keys(feedCategoryLabels) as FeedCategory[]).map((category) => <FilterChip key={category} active={filter === category} onClick={() => setFilter(category)}>{feedCategoryLabels[category]}</FilterChip>)}</div><div className="relative shrink-0 lg:w-56"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-obsidian-600 dark:text-cream-300" /><input className="ag-input min-h-10 pl-9 text-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un conseil…" aria-label="Rechercher dans le fil" /></div></div></div>
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-obsidian-600 dark:text-cream-300">{visibleQuestions.length} discussion{visibleQuestions.length > 1 ? 's' : ''}</p><button type="button" className="ag-button-ghost min-h-9 px-2.5 text-xs"><span className="hidden sm:inline">Trier par </span>Plus récentes <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          {visibleQuestions.length > 0 ? visibleQuestions.map((question) => <QuestionCard key={question.id} question={question} />) : <div className="ag-card p-10 text-center"><Search className="mx-auto h-8 w-8 text-obsidian-600 dark:text-cream-300" /><h2 className="mt-4 text-lg font-bold text-obsidian-900 dark:text-cream-50">Aucune discussion trouvée</h2><p className="mt-2 text-sm text-obsidian-600 dark:text-cream-300">Essayez un autre mot-clé ou posez une nouvelle question.</p></div>}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start"><div className="ag-card p-5"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500"><Flame className="h-4 w-4" /></span><div><p className="text-sm font-bold text-obsidian-900 dark:text-cream-50">Sujets populaires</p><p className="text-[11px] text-obsidian-600 dark:text-cream-300">Cette semaine</p></div></div><div className="mt-4 space-y-3"><PopularTopic label="Fertilisation du maïs" count="38 discussions" /><PopularTopic label="Maladies des volailles" count="24 discussions" /><PopularTopic label="Gestion de l’eau" count="17 discussions" /></div></div><div className="ag-card p-5"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-territory-500/10 text-territory-700 dark:text-territory-300"><HelpCircle className="h-4 w-4" /></span><p className="text-sm font-bold text-obsidian-900 dark:text-cream-50">Bien formuler sa question</p></div><ul className="mt-4 space-y-3 text-xs leading-5 text-obsidian-600 dark:text-cream-300"><li className="flex gap-2"><span className="text-territory-500">01</span>Indiquez le lieu et la date d’apparition.</li><li className="flex gap-2"><span className="text-territory-500">02</span>Ajoutez une photo ou une note vocale.</li><li className="flex gap-2"><span className="text-territory-500">03</span>Décrivez ce que vous avez déjà essayé.</li></ul></div><div className="ag-glass rounded-card p-5"><div className="flex items-center gap-2"><Mic className="h-4 w-4 text-territory-600 dark:text-territory-400" /><p className="text-xs font-bold text-territory-900 dark:text-territory-300">Accessibilité vocale</p></div><p className="mt-2 text-xs leading-5 text-obsidian-600 dark:text-cream-300">Les réponses certifiées peuvent être écoutées en français ou en Mooré.</p><button type="button" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-territory-700 hover:underline dark:text-territory-300">Découvrir <ArrowUpRight className="h-3.5 w-3.5" /></button></div></aside>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button type="button" onClick={onClick} className={['whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold transition', active ? 'bg-territory-900 text-white dark:bg-territory-500 dark:text-obsidian-950' : 'text-obsidian-600 hover:bg-territory-500/10 dark:text-cream-300'].join(' ')} aria-pressed={active}>{children}</button>;
}

function PopularTopic({ label, count }: { label: string; count: string }) {
  return <button type="button" className="flex w-full items-center justify-between text-left"><span className="text-xs font-semibold text-obsidian-800 dark:text-cream-100">{label}</span><span className="text-[10px] text-obsidian-600 dark:text-cream-300">{count}</span></button>;
}
