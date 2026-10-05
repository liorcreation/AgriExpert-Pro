import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock3, Filter, Flame, HelpCircle, MessageCircle, Mic, Plus, Search, ShieldCheck, Sparkles, TrendingUp, UsersRound } from 'lucide-react';
import { initialQuestions, feedCategoryLabels } from '../../data/feed';
import { QuestionCard } from '../../components/feed/QuestionCard';
import { QuestionComposer } from '../../components/feed/QuestionComposer';
import type { FeedCategory, FeedQuestion } from '../../types/feed';

type FeedFilter = 'all' | FeedCategory;

const categoryLabels: Record<FeedFilter, string> = {
  all: 'Tous les sujets',
  agriculture: 'Agriculture',
  livestock: 'Élevage / Vétérinaire',
  aquaculture: 'Pisciculture',
  apiculture: 'Apiculture',
};

export function FeedPage({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [search, setSearch] = useState('');
  const [questions, setQuestions] = useState(initialQuestions);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortByAnswers, setSortByAnswers] = useState(false);

  const visibleQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return questions
      .filter((question) => {
        const matchesFilter = filter === 'all' || question.category === filter;
        const matchesSearch = !query || `${question.title} ${question.body} ${question.authorLocation}`.toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => sortByAnswers ? right.answerCount - left.answerCount : questions.indexOf(left) - questions.indexOf(right));
  }, [filter, questions, search, sortByAnswers]);

  function addQuestion(payload: { title: string; body: string; category: FeedCategory; hasVoice: boolean }) {
    const newQuestion: FeedQuestion = { id: `question-${Date.now()}`, ...payload, authorName: 'Steve D.', authorLocation: 'Votre exploitation', createdAt: 'À l’instant', answerCount: 0 };
    setQuestions((current) => [newQuestion, ...current]);
    setComposerOpen(false);
  }

  function openComposer() {
    setComposerOpen(true);
    window.setTimeout(() => document.getElementById('question-title')?.focus(), 80);
  }

  return (
    <motion.div className="ag-feed-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
      <header className="ag-feed-hero">
        <div>
          <button type="button" className="ag-feed-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au tableau de bord</button>
          <div className="ag-feed-eyebrow"><span className="ag-feed-eyebrow-dot" /><UsersRound className="h-3.5 w-3.5" /> Réseau de conseil terrain</div>
          <h1>Le terrain parle.<br /><em>Les experts répondent.</em></h1>
          <p className="ag-feed-lead">Un fil vivant de questions, d’expériences et de réponses vérifiées pour décider plus sereinement, parcelle après parcelle.</p>
        </div>
        <div className="ag-feed-hero-actions">
          <div className="ag-feed-online-card"><span className="ag-feed-online-orbit"><span /></span><div><strong>148 experts</strong><small>disponibles maintenant</small></div><ArrowUpRight className="h-4 w-4" /></div>
          <button type="button" className="ag-feed-primary" onClick={openComposer}><Plus className="h-4 w-4" /> Poser une question</button>
        </div>
      </header>

      <div className="ag-feed-signal-strip" aria-label="Indicateurs du réseau">
        <Signal icon={<MessageCircle className="h-4 w-4" />} label="Réponses aujourd’hui" value="24" note="+18% ce mois-ci" tone="green" />
        <Signal icon={<Clock3 className="h-4 w-4" />} label="Temps moyen" value="18 min" note="12% plus rapide" tone="gold" />
        <Signal icon={<ShieldCheck className="h-4 w-4" />} label="Réponses certifiées" value="92%" note="sur les 30 derniers jours" tone="blue" />
        <div className="ag-feed-network-state"><span /><div><strong>Réseau actif</strong><small>Les spécialistes de votre zone sont en ligne</small></div></div>
      </div>

      {composerOpen && <QuestionComposer onPublished={addQuestion} onClose={() => setComposerOpen(false)} />}

      <div className="ag-feed-layout">
        <main className="ag-feed-main">
          <section className="ag-feed-toolbar" aria-label="Filtres du fil">
            <div className="ag-feed-toolbar-top"><div className="ag-feed-toolbar-title"><span className="ag-feed-section-kicker">Explorer le réseau</span><h2>Les dernières conversations</h2></div><span className="ag-feed-live-pill"><span /> Mis à jour en direct</span></div>
            <div className="ag-feed-toolbar-controls">
              <div className="ag-feed-filters"><Filter className="h-4 w-4" aria-hidden="true" />{(['all', ...Object.keys(feedCategoryLabels)] as FeedFilter[]).map((category) => <FilterChip key={category} active={filter === category} onClick={() => setFilter(category)} count={category === 'all' ? questions.length : questions.filter((question) => question.category === category).length}>{categoryLabels[category]}</FilterChip>)}</div>
              <label className="ag-feed-search"><Search className="h-4 w-4" /><span className="sr-only">Rechercher dans le fil</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un conseil…" /></label>
            </div>
          </section>

          <div className="ag-feed-result-row"><p><strong>{visibleQuestions.length}</strong> discussion{visibleQuestions.length > 1 ? 's' : ''} dans votre réseau</p><button type="button" className="ag-feed-sort" onClick={() => setSortByAnswers((current) => !current)}><TrendingUp className="h-3.5 w-3.5" /> {sortByAnswers ? 'Plus de réponses' : 'Plus récentes'} <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          <div className="ag-feed-question-list">{visibleQuestions.length > 0 ? visibleQuestions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} onReply={openComposer} />) : <EmptyFeed onReset={() => { setSearch(''); setFilter('all'); }} />}</div>
        </main>

        <aside className="ag-feed-aside">
          <section className="ag-feed-live-card"><div className="ag-feed-aside-kicker"><Sparkles className="h-3.5 w-3.5" /> En ce moment</div><h2>Le réseau est en mouvement.</h2><p>Des spécialistes répondent aux producteurs partout au Burkina Faso.</p><div className="ag-feed-avatars"><span>AK</span><span>AT</span><span>BO</span><span>+145</span></div><div className="ag-feed-live-foot"><span><i /> 148 experts disponibles</span><button type="button" onClick={openComposer}>Demander un avis <ArrowRight className="h-3.5 w-3.5" /></button></div></section>
          <section className="ag-feed-side-card"><div className="ag-feed-side-title"><span className="ag-feed-side-icon ag-feed-side-icon-gold"><Flame className="h-4 w-4" /></span><div><h2>Sujets populaires</h2><p>Les conversations de la semaine</p></div></div><div className="ag-feed-topic-list"><PopularTopic label="Fertilisation du maïs" count="38 discussions" onClick={() => { setSearch('maïs'); setFilter('all'); }} /><PopularTopic label="Maladies des volailles" count="24 discussions" onClick={() => { setSearch('volailles'); setFilter('all'); }} /><PopularTopic label="Gestion de l’eau" count="17 discussions" onClick={() => { setSearch('eau'); setFilter('all'); }} /></div></section>
          <section className="ag-feed-side-card ag-feed-tips-card"><div className="ag-feed-side-title"><span className="ag-feed-side-icon ag-feed-side-icon-green"><HelpCircle className="h-4 w-4" /></span><div><h2>Une question utile</h2><p>pour une réponse précise</p></div></div><ol><li><b>01</b><span>Le lieu et la date d’apparition.</span></li><li><b>02</b><span>Une photo ou une note vocale.</span></li><li><b>03</b><span>Ce que vous avez déjà essayé.</span></li></ol><div className="ag-feed-voice-note"><Mic className="h-4 w-4" /><span>Vous pouvez parler en français ou en Mooré.</span></div></section>
        </aside>
      </div>
    </motion.div>
  );
}

function Signal({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: 'green' | 'gold' | 'blue' }) {
  return <div className="ag-feed-signal"><span className={`ag-feed-signal-icon ag-feed-signal-${tone}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></div>;
}

function FilterChip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: string; count: number }) {
  return <button type="button" onClick={onClick} className={['ag-feed-filter', active ? 'ag-feed-filter-active' : ''].join(' ')} aria-pressed={active}>{children}<span>{count}</span></button>;
}

function PopularTopic({ label, count, onClick }: { label: string; count: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="ag-feed-topic"><span><i />{label}</span><small>{count}<ArrowUpRight className="h-3 w-3" /></small></button>;
}

function EmptyFeed({ onReset }: { onReset: () => void }) {
  return <div className="ag-feed-empty"><span><Search className="h-5 w-5" /></span><h2>Aucune discussion trouvée</h2><p>Essayez un autre mot-clé ou revenez à l’ensemble du réseau.</p><button type="button" onClick={onReset}>Réinitialiser les filtres <ArrowRight className="h-3.5 w-3.5" /></button></div>;
}
