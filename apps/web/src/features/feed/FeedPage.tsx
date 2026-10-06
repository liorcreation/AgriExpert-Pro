import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, Filter, Flame, HelpCircle, Landmark, MessageCircle, Mic, Plus, Radio, Search, ShieldCheck, Sparkles, TrendingUp, UsersRound } from 'lucide-react';
import { initialQuestions, feedCategoryLabels } from '../../data/feed';
import { QuestionCard } from '../../components/feed/QuestionCard';
import { QuestionComposer } from '../../components/feed/QuestionComposer';
import type { FeedCategory, FeedQuestion } from '../../types/feed';
import type { UserRole } from '../../types/shell';
import { getOfflineDrafts, queueOfflineDraft, removeOfflineDraft, syncOfflineDrafts } from '../../lib/offlineQueue';
import { isApiConfigured, listQuestions, publishQuestion, type PersistedQuestion } from '../../lib/api';

type FeedFilter = 'all' | FeedCategory;

function mapPersistedQuestion(question: PersistedQuestion): FeedQuestion {
  return {
    id: String(question.id),
    category: question.category,
    title: question.title,
    body: question.body,
    authorName: question.author_name,
    authorLocation: 'Réseau AgriExpert',
    createdAt: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(question.created_at)),
    hasVoice: Boolean(question.has_voice),
    hasPhoto: Boolean(question.has_photo),
    photoName: question.photo_name ?? undefined,
    answerCount: question.answer_count ?? 0,
  };
}

const categoryLabels: Record<FeedFilter, string> = {
  all: 'Tous les sujets',
  agriculture: 'Agriculture',
  livestock: 'Élevage / Vétérinaire',
  aquaculture: 'Pisciculture',
  apiculture: 'Apiculture',
};

export function FeedPage({ role, onBack }: { role: UserRole; onBack: () => void }) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [search, setSearch] = useState('');
  const [questions, setQuestions] = useState<FeedQuestion[]>(isApiConfigured ? [] : initialQuestions);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortByAnswers, setSortByAnswers] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(() => getOfflineDrafts().filter((draft) => draft.status === 'queued').length);

  useEffect(() => {
    if (!isApiConfigured) return;
    listQuestions().then((response) => setQuestions(response.data.map(mapPersistedQuestion))).catch(() => undefined);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const queued = getOfflineDrafts().filter((draft) => draft.status === 'queued');
      if (!isApiConfigured) {
        const synced = syncOfflineDrafts();
        setOfflineCount(synced.length ? 0 : queued.length);
        return;
      }
      void Promise.allSettled(queued.map((draft) => publishQuestion(draft).then(() => removeOfflineDraft(draft.id))))
        .finally(() => setOfflineCount(getOfflineDrafts().filter((draft) => draft.status === 'queued').length));
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

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

  async function addQuestion(payload: { title: string; body: string; category: FeedCategory; hasVoice: boolean; hasPhoto: boolean; photoName?: string; photoPreview?: string }) {
    if (isOnline && isApiConfigured) {
      try {
        const response = await publishQuestion(payload);
        setQuestions((current) => [mapPersistedQuestion(response.data), ...current]);
        setComposerOpen(false);
        return;
      } catch {
        // Keep the question locally and retry when the network is back.
      }
    }
    const newQuestion: FeedQuestion = { id: `question-${Date.now()}`, ...payload, authorName: 'Vous', authorLocation: 'Votre exploitation', createdAt: 'À l’instant', answerCount: 0 };
    setQuestions((current) => [newQuestion, ...current]);
    queueOfflineDraft(payload);
    setOfflineCount((current) => current + 1);
    setComposerOpen(false);
  }

  function openComposer() {
    setComposerOpen(true);
    window.setTimeout(() => document.getElementById('question-title')?.focus(), 80);
  }

  if (role === 'expert') return <ExpertFeedWorkspace onBack={onBack} />;
  if (role === 'institution') return <InstitutionFeedWorkspace onBack={onBack} />;

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

      <div className={isOnline ? 'ag-feed-sync-banner ag-feed-sync-online' : 'ag-feed-sync-banner ag-feed-sync-offline'}><span /><strong>{isOnline ? 'Réseau disponible' : 'Mode hors-ligne'}</strong><small>{isOnline ? (offlineCount ? `${offlineCount} brouillon(s) synchronisé(s)` : 'Vos questions seront synchronisées automatiquement') : 'Questions et photos enregistrées sur cet appareil'}</small>{offlineCount > 0 && <span className="ag-feed-sync-count">{offlineCount}</span>}</div>
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

function ExpertFeedWorkspace({ onBack }: { onBack: () => void }) {
  return <motion.div className="agri-role-page agri-expert-feed-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
    <header className="agri-role-page-hero"><div><button type="button" className="agri-role-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour à mon espace expert</button><div className="agri-role-eyebrow"><span /> File d’expertise · Réseau actif</div><h1>Les producteurs attendent.<br /><em>Votre expertise agit.</em></h1><p>Qualifier les demandes, prioriser les urgences et apporter une réponse certifiée depuis un seul espace de travail.</p></div><div className="agri-role-hero-orb agri-role-hero-orb-expert"><BriefcaseBusiness className="h-7 w-7" /><strong>12</strong><span>demandes à traiter</span></div></header>
    <div className="agri-role-stat-grid"><RoleFeedStat label="À qualifier" value="12" detail="4 prioritaires" tone="green" /><RoleFeedStat label="Réponses cette semaine" value="38" detail="+18% vs. semaine passée" tone="gold" /><RoleFeedStat label="Délai moyen" value="18 min" detail="objectif réseau · 30 min" tone="blue" /><RoleFeedStat label="Satisfaction" value="4,9/5" detail="74 avis producteurs" tone="violet" /></div><section className="agri-diagnostic-card"><div className="agri-diagnostic-copy"><span className="agri-role-eyebrow"><span /> Vision terrain · Diagnostic assisté</span><h2>Une photo, des indices exploitables.</h2><p>Les producteurs peuvent joindre une image HD de la plante ou de l’animal. Qualifiez les symptômes, annotez l’observation et envoyez votre première hypothèse.</p><div className="agri-diagnostic-tags"><span>HD sécurisé</span><span>Annotation expert</span><span>Historique du cas</span></div></div><div className="agri-diagnostic-visual"><div className="agri-diagnostic-leaf">◒</div><span>Photo reçue · Maïs · 4,2 Mo</span><b>À analyser</b></div></section>
    <div className="agri-role-work-grid"><section className="agri-role-work-card"><div className="agri-role-card-head"><div><span>À traiter maintenant</span><h2>Votre file de qualification</h2></div><span className="agri-role-live"><i /> En direct</span></div><ExpertFeedQueue title="Feuilles de maïs jaunissantes" detail="Awa Traoré · Agriculture · il y a 9 min" tag="Prioritaire" tone="red" /><ExpertFeedQueue title="Suspicion de maladie aviaire" detail="Moussa K. · Élevage · il y a 24 min" tag="Nouveau" tone="gold" /><ExpertFeedQueue title="Qualité de l’eau du bassin" detail="Issa O. · Pisciculture · il y a 41 min" tag="À qualifier" tone="blue" /><button type="button" className="agri-role-card-link">Ouvrir toute la file <ArrowRight className="h-4 w-4" /></button></section><aside className="agri-role-work-card agri-role-work-card-dark"><div className="agri-role-card-head"><div><span>Votre permanence</span><h2>Les rendez-vous du jour</h2></div><Radio className="h-5 w-5" /></div><div className="agri-role-agenda-line"><strong>09:30</strong><div><b>Appel avec Karim Sawadogo</b><small>Suivi parcelle · Ouagadougou</small></div><CheckCircle2 className="h-4 w-4" /></div><div className="agri-role-agenda-line"><strong>11:00</strong><div><b>Visite d’exploitation</b><small>Élevage · Koubri</small></div><Clock3 className="h-4 w-4" /></div><div className="agri-role-agenda-line"><strong>15:30</strong><div><b>Permanence réseau</b><small>Questions ouvertes · En ligne</small></div><Radio className="h-4 w-4" /></div></aside></div>
  </motion.div>;
}

function InstitutionFeedWorkspace({ onBack }: { onBack: () => void }) {
  return <motion.div className="agri-role-page agri-institution-feed-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
    <header className="agri-role-page-hero"><div><button type="button" className="agri-role-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour à la supervision</button><div className="agri-role-eyebrow"><span /> Observatoire national · Données en direct</div><h1>Lire les signaux.<br /><em>Coordonner l’action.</em></h1><p>Un observatoire consolidé des demandes terrain pour repérer les tendances, suivre les territoires sensibles et orienter les moyens.</p></div><div className="agri-role-hero-orb agri-role-hero-orb-institution"><Landmark className="h-7 w-7" /><strong>67</strong><span>alertes à surveiller</span></div></header>
    <div className="agri-role-stat-grid"><RoleFeedStat label="Demandes nationales" value="1 284" detail="sur les 30 derniers jours" tone="green" /><RoleFeedStat label="Territoires actifs" value="12" detail="régions couvertes" tone="gold" /><RoleFeedStat label="Sujets émergents" value="8" detail="à analyser cette semaine" tone="blue" /><RoleFeedStat label="Réponses certifiées" value="92%" detail="qualité du réseau" tone="violet" /></div>
    <div className="agri-role-work-grid"><section className="agri-role-work-card"><div className="agri-role-card-head"><div><span>Veille des conversations</span><h2>Tendances à examiner</h2></div><span className="agri-role-live"><i /> Actualisé il y a 2 min</span></div><InstitutionFeedSignal title="Maladies aviaires" detail="Centre-Nord · 18 signalements cette semaine" trend="+32%" tone="red" /><InstitutionFeedSignal title="Fertilisation du maïs" detail="Boucle du Mouhoun · 146 demandes" trend="+18%" tone="gold" /><InstitutionFeedSignal title="Qualité de l’eau" detail="Hauts-Bassins · 11 signalements" trend="+9%" tone="blue" /><button type="button" className="agri-role-card-link">Voir l’analyse territoriale <ArrowRight className="h-4 w-4" /></button></section><aside className="agri-role-work-card agri-role-work-card-dark"><div className="agri-role-card-head"><div><span>Décision recommandée</span><h2>À mettre à l’agenda</h2></div><ShieldCheck className="h-5 w-5" /></div><div className="agri-role-decision"><strong>Renforcer la veille aviaire</strong><p>3 départements présentent une hausse simultanée des demandes vétérinaires.</p><button type="button">Ouvrir le brief <ArrowUpRight className="h-4 w-4" /></button></div></aside></div>
  </motion.div>;
}

function RoleFeedStat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className={`agri-role-stat agri-role-stat-${tone}`}><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>;
}

function ExpertFeedQueue({ title, detail, tag, tone }: { title: string; detail: string; tag: string; tone: string }) {
  return <button type="button" className={`agri-role-queue agri-role-queue-${tone}`}><span><i />{tag}</span><div><strong>{title}</strong><small>{detail}</small></div><ArrowUpRight className="h-4 w-4" /></button>;
}

function InstitutionFeedSignal({ title, detail, trend, tone }: { title: string; detail: string; trend: string; tone: string }) {
  return <div className={`agri-role-signal agri-role-signal-${tone}`}><span className="agri-role-signal-icon"><TrendingUp className="h-4 w-4" /></span><div><strong>{title}</strong><small>{detail}</small></div><b>{trend}</b></div>;
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
