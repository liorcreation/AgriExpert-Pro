import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, Camera, Check, CheckCircle2, ChevronDown, CircleDot, Clock3, Filter, FileText, Flame, HelpCircle, ImagePlus, Landmark, LoaderCircle, MapPin, MessageCircle, Mic, Plus, Radio, RefreshCw, Search, Send, Settings2, ShieldCheck, Sparkles, TrendingUp, UserRound, UsersRound, X } from 'lucide-react';
import { initialQuestions, feedCategoryLabels } from '../../data/feed';
import { QuestionCard } from '../../components/feed/QuestionCard';
import { QuestionComposer } from '../../components/feed/QuestionComposer';
import type { FeedCategory, FeedQuestion } from '../../types/feed';
import type { UserRole } from '../../types/shell';
import type { NavigationKey } from '../../types/shell';
import { AudioRecorder } from '../../components/emergencies/AudioRecorder';
import { getOfflineQueueSummary, queueOfflineDraft, syncOfflineDrafts, type OfflineQueueSummary } from '../../lib/offlineQueue';
import { getExpertCase, getExpertWorkspace, getInstitutionalDashboard, isApiConfigured, listExpertColleagues, listQuestions, mediaUrl, publishQuestion, reactToQuestion, updateEmergencyAvailability, updateExpertCase, uploadMedia, type ExpertCase, type ExpertWorkspaceData, type InstitutionalDashboardData, type PersistedQuestion } from '../../lib/api';

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
    photoUrl: question.photo_asset_id ? mediaUrl(question.photo_asset_id) : undefined,
    voiceUrl: question.voice_asset_id ? mediaUrl(question.voice_asset_id) : undefined,
    voiceTranscript: question.voice_transcript ?? undefined,
    voiceTranscriptLanguage: question.voice_transcript_language ?? undefined,
    answerCount: question.answer_count ?? 0,
    usefulCount: question.useful_count ?? 0,
    answer: question.answer ? {
      id: String(question.answer.id),
      expertName: question.answer.expert_name,
      expertRole: question.answer.expert_role ?? 'Expert AgriExpert',
      initials: question.answer.expert_name.split(' ').map((item) => item[0]).join('').slice(0, 2),
      body: question.answer.body,
      language: question.answer.language,
      certified: Boolean(question.answer.certified),
      voiceAssetId: question.answer.voice_asset_id ?? null,
      createdAt: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(question.answer.created_at)),
    } : undefined,
  };
}

const categoryLabels: Record<FeedFilter, string> = {
  all: 'Tous les sujets',
  agriculture: 'Agriculture',
  livestock: 'Élevage / Vétérinaire',
  aquaculture: 'Pisciculture',
  apiculture: 'Apiculture',
};

function normalizeSearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

export function FeedPage({ role, onBack, onNavigate, openComposerRequest = false, initialComposerMode = 'text', onComposerRequestHandled }: { role: UserRole; onBack: () => void; onNavigate?: (key: NavigationKey) => void; openComposerRequest?: boolean; initialComposerMode?: 'text' | 'voice'; onComposerRequestHandled?: () => void }) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [search, setSearch] = useState('');
  const [questions, setQuestions] = useState<FeedQuestion[]>(isApiConfigured ? [] : initialQuestions);
  const [feedLoading, setFeedLoading] = useState(isApiConfigured);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [lastFeedUpdate, setLastFeedUpdate] = useState<number | null>(null);
  const hasLoadedFeedRef = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortByAnswers, setSortByAnswers] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueSummary>({ queued: 0, uploading: 0, failed: 0, pending: 0 });
  const [retryingOffline, setRetryingOffline] = useState(false);

  async function refreshOfflineQueue() {
    setOfflineQueue(await getOfflineQueueSummary());
  }

  async function retryOfflineQueue() {
    if (retryingOffline || !isApiConfigured || !isOnline) return;
    setRetryingOffline(true);
    try {
      await syncOfflineDrafts();
      await refreshOfflineQueue();
    } finally {
      setRetryingOffline(false);
    }
  }

  async function refreshQuestions() {
    if (!isApiConfigured) return;
    if (hasLoadedFeedRef.current) setFeedRefreshing(true);
    else setFeedLoading(true);
    setFeedError('');
    try {
      const response = await listQuestions();
      setQuestions(response.data.map(mapPersistedQuestion));
      hasLoadedFeedRef.current = true;
      setLastFeedUpdate(Date.now());
    } catch (reason: unknown) {
      setFeedError(reason instanceof Error ? reason.message : 'Le fil est momentanément indisponible.');
    } finally {
      setFeedLoading(false);
      setFeedRefreshing(false);
    }
  }

  useEffect(() => { void refreshOfflineQueue(); }, []);

  useEffect(() => {
    if (!openComposerRequest || role !== 'producer') return;
    setComposerOpen(true);
    onComposerRequestHandled?.();
  }, [openComposerRequest, onComposerRequestHandled, role]);

  useEffect(() => {
    if (!isApiConfigured) return;
    void refreshQuestions();
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncOfflineDrafts();
      await Promise.all([refreshOfflineQueue(), refreshQuestions()]);
    };
    const handleOffline = () => setIsOnline(false);
    const handleBackgroundSync = () => {
      void syncOfflineDrafts().then(async () => {
        await Promise.all([refreshOfflineQueue(), refreshQuestions()]);
      });
    };
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline); window.addEventListener('agriexpert:offline-sync', handleBackgroundSync);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); window.removeEventListener('agriexpert:offline-sync', handleBackgroundSync); };
  }, []);

  const visibleQuestions = useMemo(() => {
    const terms = normalizeSearchText(search.trim()).split(/\s+/).filter(Boolean);
    return questions
      .filter((question) => {
        const matchesFilter = filter === 'all' || question.category === filter;
        const searchableText = normalizeSearchText([
          question.title,
          question.body,
          question.authorName,
          question.authorLocation,
          question.voiceTranscript ?? '',
          question.photoName ?? '',
          feedCategoryLabels[question.category],
        ].join(' '));
        const matchesSearch = terms.every((term) => searchableText.includes(term));
        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => sortByAnswers ? right.answerCount - left.answerCount : questions.indexOf(left) - questions.indexOf(right));
  }, [filter, questions, search, sortByAnswers]);
  const totalAnswers = questions.reduce((total, question) => total + question.answerCount, 0);
  const questionsWithMedia = questions.filter((question) => question.hasPhoto || question.hasVoice).length;
  const categoryTotals = (Object.keys(feedCategoryLabels) as FeedCategory[]).map((category) => ({
    category,
    count: questions.filter((question) => question.category === category).length,
  }));

  async function addQuestion(payload: { title: string; body: string; category: FeedCategory; hasVoice: boolean; hasPhoto: boolean; photo?: File; voice?: Blob; photoName?: string; photoPreview?: string; photoAssetId?: number; voiceAssetId?: number; voiceTranscript?: string; diagnosisId?: number }) {
    const clientRequestId = `question-${crypto.randomUUID()}`;
    if (isOnline && isApiConfigured) {
      try {
        const attachments = await Promise.all([
          payload.photoAssetId ? null : payload.photo ? uploadMedia(payload.photo, 'photo', payload.photo.name, `${clientRequestId}:photo`, true) : null,
          payload.voiceAssetId ? null : payload.voice ? uploadMedia(payload.voice, 'voice', 'question.webm', `${clientRequestId}:voice`, true) : null,
        ]);
        const response = await publishQuestion({ title: payload.title, body: payload.body, category: payload.category, hasVoice: payload.hasVoice, hasPhoto: payload.hasPhoto, photoName: payload.photoName, diagnosisId: payload.diagnosisId, clientRequestId, voiceTranscript: payload.voiceTranscript, attachmentIds: [payload.photoAssetId, payload.voiceAssetId, ...attachments.flatMap((item) => item ? [item.data.id] : [])].filter((item): item is number => Number.isInteger(item)) });
        setQuestions((current) => [mapPersistedQuestion(response.data), ...current]);
        setComposerOpen(false);
        return;
      } catch {
        // Keep the question locally and retry when the network is back.
      }
    }
    const newQuestion: FeedQuestion = { id: `question-${Date.now()}`, title: payload.title, body: payload.body, category: payload.category, hasVoice: payload.hasVoice, hasPhoto: payload.hasPhoto, photoName: payload.photoName, photoPreview: payload.photoPreview, authorName: 'Vous', authorLocation: 'Votre exploitation', createdAt: 'À l’instant', answerCount: 0 };
    setQuestions((current) => [newQuestion, ...current]);
    await queueOfflineDraft({ clientRequestId, title: payload.title, body: payload.body, category: payload.category, hasVoice: payload.hasVoice, hasPhoto: payload.hasPhoto, photo: payload.photo, voice: payload.voice, photoAssetId: payload.photoAssetId, voiceAssetId: payload.voiceAssetId, voiceTranscript: payload.voiceTranscript, photoName: payload.photoName, voiceName: 'question.webm' });
    await refreshOfflineQueue();
    setComposerOpen(false);
  }

  function openComposer() {
    setComposerOpen(true);
    window.setTimeout(() => document.getElementById('question-title')?.focus(), 80);
  }

  if (role === 'expert') return <ExpertOperationsWorkspace onBack={onBack} onNavigate={onNavigate} />;
  if (role === 'institution') return <InstitutionFeedWorkspace onBack={onBack} onNavigate={onNavigate} />;

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
          <div className="ag-feed-online-card"><span className="ag-feed-online-orbit"><span /></span><div><strong>{feedLoading ? 'Fil en cours…' : `${questions.length} discussion${questions.length > 1 ? 's' : ''}`}</strong><small>dans le réseau chargé</small></div><ArrowUpRight className="h-4 w-4" /></div>
          <button type="button" className="ag-feed-primary" onClick={openComposer}><Plus className="h-4 w-4" /> Poser une question</button>
        </div>
      </header>

      <div className="ag-feed-signal-strip" aria-label="Indicateurs du réseau">
        <Signal icon={<MessageCircle className="h-4 w-4" />} label="Discussions" value={feedLoading ? '—' : String(questions.length)} note={feedLoading ? 'chargement du fil…' : 'dans le fil chargé'} tone="green" />
        <Signal icon={<Clock3 className="h-4 w-4" />} label="Réponses reçues" value={feedLoading ? '—' : String(totalAnswers)} note={feedLoading ? 'chargement du fil…' : 'sur ces discussions'} tone="gold" />
        <Signal icon={<ShieldCheck className="h-4 w-4" />} label="Avec photo ou voix" value={feedLoading ? '—' : String(questionsWithMedia)} note={feedLoading ? 'chargement du fil…' : 'contexte partagé par le terrain'} tone="blue" />
        <div className="ag-feed-network-state"><span /><div><strong>{isOnline ? 'Connexion disponible' : 'Mode hors-ligne'}</strong><small>{isOnline ? 'Le fil peut être actualisé' : 'Vos brouillons restent sur cet appareil'}</small></div></div>
      </div>

      <div className={isOnline ? 'ag-feed-sync-banner ag-feed-sync-online' : 'ag-feed-sync-banner ag-feed-sync-offline'}><span /><strong>{isOnline ? 'Réseau disponible' : 'Mode hors-ligne'}</strong><small>{offlineQueue.failed > 0 ? `${offlineQueue.failed} envoi${offlineQueue.failed > 1 ? 's' : ''} en échec · les brouillons restent sur cet appareil.` : offlineQueue.uploading > 0 ? `${offlineQueue.uploading} envoi${offlineQueue.uploading > 1 ? 's' : ''} en cours…` : offlineQueue.queued > 0 ? `${offlineQueue.queued} brouillon${offlineQueue.queued > 1 ? 's' : ''} en attente de synchronisation.` : isOnline ? 'Aucun brouillon en attente de synchronisation.' : 'Vos brouillons restent enregistrés sur cet appareil.'}</small>{offlineQueue.pending > 0 && <span className="ag-feed-sync-count" aria-label={`${offlineQueue.pending} brouillons non synchronisés`}>{offlineQueue.pending}</span>}{isOnline && isApiConfigured && offlineQueue.failed > 0 && <button type="button" className="ag-feed-sync-retry" onClick={() => void retryOfflineQueue()} disabled={retryingOffline}>{retryingOffline ? 'Nouvel essai…' : 'Réessayer'}</button>}</div>
      {composerOpen && <QuestionComposer initialMode={initialComposerMode} onPublished={addQuestion} onClose={() => setComposerOpen(false)} />}

      <div className="ag-feed-layout">
        <main className="ag-feed-main">
          <section className="ag-feed-toolbar" aria-label="Filtres du fil">
            <div className="ag-feed-toolbar-top"><div className="ag-feed-toolbar-title"><span className="ag-feed-section-kicker">Explorer le réseau</span><h2>Les dernières conversations</h2></div><div className="ag-feed-toolbar-status"><span className="ag-feed-live-pill"><span />{lastFeedUpdate ? `Actualisé à ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(lastFeedUpdate)}` : isApiConfigured ? 'Connexion au fil' : 'Aperçu local'}</span><button type="button" className="ag-feed-refresh-button" onClick={() => void refreshQuestions()} disabled={!isApiConfigured || feedLoading || feedRefreshing} aria-label={feedRefreshing ? 'Actualisation des discussions en cours' : 'Actualiser les discussions'} aria-busy={feedRefreshing}><RefreshCw className={feedRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />{feedRefreshing ? 'Actualisation…' : 'Actualiser'}</button></div></div>
            <div className="ag-feed-toolbar-controls">
              <div className="ag-feed-filters"><Filter className="h-4 w-4" aria-hidden="true" />{(['all', ...Object.keys(feedCategoryLabels)] as FeedFilter[]).map((category) => <FilterChip key={category} active={filter === category} onClick={() => setFilter(category)} count={category === 'all' ? questions.length : questions.filter((question) => question.category === category).length}>{categoryLabels[category]}</FilterChip>)}</div>
              <div className="ag-feed-search"><Search className="h-4 w-4" aria-hidden="true" /><input aria-label="Rechercher dans le fil par sujet, producteur, filière ou transcription" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un conseil…" />{search && <button type="button" className="ag-feed-search-clear" onClick={() => setSearch('')} aria-label="Effacer la recherche"><X className="h-4 w-4" /></button>}</div>
            </div>
          </section>

          {feedError && questions.length > 0 && <div className="ag-feed-stale-alert" role="alert"><AlertTriangle className="h-5 w-5" /><span><strong>Le fil n’a pas pu être actualisé.</strong><small>Les discussions déjà chargées restent visibles. {feedError}</small></span><button type="button" onClick={() => void refreshQuestions()} disabled={feedLoading}>{feedLoading ? 'Actualisation…' : 'Réessayer'}</button></div>}
          <div className="ag-feed-result-row"><p role="status" aria-live="polite" aria-atomic="true"><strong>{visibleQuestions.length}</strong> discussion{visibleQuestions.length > 1 ? 's' : ''} trouvée{visibleQuestions.length > 1 ? 's' : ''}</p><button type="button" className="ag-feed-sort" onClick={() => setSortByAnswers((current) => !current)} aria-label="Ordre de tri des discussions" aria-pressed={sortByAnswers}><TrendingUp className="h-3.5 w-3.5" /> {sortByAnswers ? 'Plus de réponses' : 'Plus récentes'} <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          <div className="ag-feed-question-list" aria-busy={feedLoading || feedRefreshing}>{feedLoading ? <FeedLoadingState /> : feedError && questions.length === 0 ? <FeedErrorState message={feedError} onRetry={() => void refreshQuestions()} /> : visibleQuestions.length > 0 ? visibleQuestions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} onAskExpert={openComposer} onReaction={async (reacted) => { if (!isApiConfigured || !/^\d+$/.test(question.id)) return; const result = await reactToQuestion(question.id, reacted); setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, reacted, usefulCount: result.data.useful_count } : item)); }} />) : <EmptyFeed isFiltered={questions.length > 0} onReset={() => { setSearch(''); setFilter('all'); }} onCreate={openComposer} />}</div>
        </main>

        <aside className="ag-feed-aside">
          <section className="ag-feed-live-card"><div className="ag-feed-aside-kicker"><Sparkles className="h-3.5 w-3.5" /> Votre réseau</div><h2>Une question de terrain ?</h2><p>Décrivez votre situation et partagez une photo ou une note vocale pour aider les spécialistes à vous répondre.</p><div className="ag-feed-live-foot"><span><i /> {feedLoading ? 'Mise à jour du fil…' : `${questions.length} discussion${questions.length > 1 ? 's' : ''} dans le fil`}</span><button type="button" onClick={openComposer}>Demander un avis <ArrowRight className="h-3.5 w-3.5" /></button></div></section>
          <section className="ag-feed-side-card"><div className="ag-feed-side-title"><span className="ag-feed-side-icon ag-feed-side-icon-gold"><Flame className="h-4 w-4" /></span><div><h2>Explorer par filière</h2><p>Volume de discussions chargées</p></div></div><div className="ag-feed-topic-list">{categoryTotals.map(({ category, count }) => <PopularTopic key={category} label={categoryLabels[category]} count={feedLoading ? '—' : `${count} discussion${count > 1 ? 's' : ''}`} onClick={() => { setSearch(''); setFilter(category); }} />)}</div></section>
          <section className="ag-feed-side-card ag-feed-tips-card"><div className="ag-feed-side-title"><span className="ag-feed-side-icon ag-feed-side-icon-green"><HelpCircle className="h-4 w-4" /></span><div><h2>Une question utile</h2><p>pour une réponse précise</p></div></div><ol><li><b>01</b><span>Le lieu et la date d’apparition.</span></li><li><b>02</b><span>Une photo ou une note vocale.</span></li><li><b>03</b><span>Ce que vous avez déjà essayé.</span></li></ol><div className="ag-feed-voice-note"><Mic className="h-4 w-4" /><span>Vous pouvez parler en français ou en Mooré.</span></div></section>
        </aside>
      </div>
    </motion.div>
  );
}

function ExpertOperationsWorkspace({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (key: NavigationKey) => void }) {
  const [workspace, setWorkspace] = useState<ExpertWorkspaceData | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [caseFile, setCaseFile] = useState<ExpertCase | null>(null);
  const [colleagues, setColleagues] = useState<Array<{ id: number; name: string; profile?: string | null; is_available: number }>>([]);
  const [draft, setDraft] = useState('');
  const [infoDraft, setInfoDraft] = useState('');
  const [annotation, setAnnotation] = useState({ label: '', note: '', x: 38, y: 32, width: 22, height: 18 });
  const [voice, setVoice] = useState<Blob | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function refresh(nextId = selectedId) {
    try {
      const [workspaceResponse, colleagueResponse] = await Promise.all([getExpertWorkspace(), listExpertColleagues()]);
      setWorkspace(workspaceResponse.data);
      setColleagues(colleagueResponse.data);
      const targetId = nextId ?? workspaceResponse.data.queue[0]?.id ?? null;
      if (targetId) {
        setSelectedId(targetId);
        const detail = await getExpertCase(targetId);
        setCaseFile(detail.data);
      } else { setSelectedId(null); setCaseFile(null); }
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Impossible de charger votre espace expert.'); }
  }

  useEffect(() => { void refresh(null); }, []);

  async function selectCase(id: number) {
    setSelectedId(id); setError('');
    try { const response = await getExpertCase(id); setCaseFile(response.data); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Dossier indisponible.'); }
  }

  async function performAction(input: Parameters<typeof updateExpertCase>[1]) {
    if (!selectedId) return;
    setBusy(input.action); setError('');
    try { const response = await updateExpertCase(selectedId, input); setCaseFile(response.data); await refresh(selectedId); if (input.action === 'reply') { setDraft(''); setVoice(null); } if (input.action === 'request-info') setInfoDraft(''); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Action impossible.'); } finally { setBusy(''); }
  }

  async function reply() {
    if (!draft.trim() && !voice) return;
    let voiceAssetId: number | undefined;
    setBusy('reply'); setError('');
    try { if (voice) voiceAssetId = (await uploadMedia(voice, 'voice', 'reponse-expert.webm', undefined, true)).data.id; await performAction({ action: 'reply', body: draft.trim() || 'Réponse vocale jointe.', language: 'fr', voiceAssetId }); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Envoi de la réponse impossible.'); setBusy(''); }
  }

  async function toggleAvailability() {
    if (!workspace) return;
    setBusy('availability'); setError('');
    if (workspace.availability.is_available) {
      try { const response = await updateEmergencyAvailability({ isAvailable: false, radiusKm: workspace.availability.radius_km }); setWorkspace((current) => current ? { ...current, availability: response.data } : current); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Mise à jour impossible.'); }
      setBusy(''); return;
    }
    if (!navigator.geolocation) { setError('La géolocalisation est nécessaire pour apparaître disponible.'); setBusy(''); return; }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try { const response = await updateEmergencyAvailability({ isAvailable: true, latitude: position.coords.latitude, longitude: position.coords.longitude, radiusKm: workspace.availability.radius_km }); setWorkspace((current) => current ? { ...current, availability: response.data } : current); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Activation de la disponibilité impossible.'); } finally { setBusy(''); }
    }, () => { setError('Autorisez la position pour être proposé aux producteurs proches.'); setBusy(''); }, { enableHighAccuracy: true, timeout: 8000 });
  }

  const queue = workspace?.queue ?? [];
  const photo = caseFile?.media.find((item) => item.kind === 'photo');
  const producerVoice = caseFile?.media.find((item) => item.kind === 'voice');
  const annotationCount = caseFile?.annotations.length ?? 0;
  return <motion.div className="agri-role-page agri-expert-operations" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
    <header className="agri-role-page-hero agri-expert-operations-hero"><div><button type="button" className="agri-role-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour à mon espace expert</button><div className="agri-role-eyebrow"><span /> Espace de travail · Dossiers terrain</div><h1>Chaque demande mérite<br /><em>une réponse précise.</em></h1><p>Ouvrez le dossier complet, prenez la demande en charge, documentez vos observations et clôturez avec une réponse certifiée.</p><div className="agri-expert-hero-actions"><button type="button" className={workspace?.availability.is_available ? 'agri-expert-availability agri-expert-availability-on' : 'agri-expert-availability'} onClick={() => void toggleAvailability()} disabled={busy === 'availability'}><CircleDot className="h-4 w-4" /> {workspace?.availability.is_available ? 'Disponible · visible sur la carte' : 'Passer disponible'} </button><button type="button" className="agri-expert-sos-button" onClick={() => onNavigate?.('emergency')}><AlertTriangle className="h-4 w-4" /> Déclarer une urgence</button></div></div><div className="agri-role-hero-orb agri-role-hero-orb-expert"><BriefcaseBusiness className="h-7 w-7" /><strong>{workspace?.stats.assigned ?? '—'}</strong><span>dossiers en cours</span></div></header>
    {error && <div className="agri-expert-error" role="alert"><X className="h-4 w-4" /> {error}</div>}
    <div className="agri-role-stat-grid"><RoleFeedStat label="À qualifier" value={String(workspace?.stats.queued ?? '—')} detail="demandes ouvertes" tone="green" /><RoleFeedStat label="Dossiers en cours" value={String(workspace?.stats.assigned ?? '—')} detail="votre prise en charge" tone="gold" /><RoleFeedStat label="Réponses cette semaine" value={String(workspace?.stats.responsesWeek ?? '—')} detail="publiées et certifiées" tone="blue" /><RoleFeedStat label="Rémunération" value={workspace?.earnings.configured ? `${workspace.earnings.pendingXof.toLocaleString('fr-FR')} F` : 'À configurer'} detail={workspace?.earnings.configured ? 'en attente de versement' : 'barème administrateur'} tone="violet" /></div>
    <div className="agri-expert-workbench"><section className="agri-expert-inbox agri-role-work-card"><div className="agri-role-card-head"><div><span>File opérationnelle</span><h2>Demandes à traiter</h2></div><span className="agri-role-live"><i /> {queue.length} dossier{queue.length > 1 ? 's' : ''}</span></div>{queue.length ? queue.map((item) => <button key={item.id} type="button" className={selectedId === item.id ? 'agri-expert-inbox-item agri-expert-inbox-item-active' : 'agri-expert-inbox-item'} onClick={() => void selectCase(item.id)}><span className={`agri-expert-inbox-dot agri-expert-inbox-dot-${item.case_status === 'in_progress' ? 'gold' : item.status === 'answered' ? 'blue' : 'green'}`} /><div><strong>{item.title}</strong><small>{item.producer_name} · {item.category} · {new Date(item.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small></div><span className="agri-expert-inbox-status">{item.case_status === 'in_progress' ? 'En cours' : item.status === 'answered' ? 'Répondu' : 'Nouveau'}</span><ChevronDown className="h-4 w-4 -rotate-90" /></button>) : <div className="agri-expert-empty"><CheckCircle2 className="h-6 w-6" /><strong>Votre file est vide</strong><span>Les nouvelles demandes apparaîtront ici.</span></div>}</section>
      <section className="agri-expert-case agri-role-work-card">{caseFile ? <><div className="agri-role-card-head"><div><span>Dossier #{caseFile.id} · {caseFile.category}</span><h2>{caseFile.title}</h2><p className="agri-expert-case-meta"><UserRound className="h-3.5 w-3.5" /> {caseFile.producer_name} · reçu le {new Date(caseFile.created_at).toLocaleString('fr-FR')}</p></div><span className={`agri-expert-status agri-expert-status-${caseFile.case_status ?? 'queued'}`}>{caseFile.case_status === 'in_progress' ? 'En cours' : caseFile.case_status === 'waiting_producer' ? 'En attente producteur' : caseFile.case_status === 'answered' ? 'Répondu' : caseFile.case_status === 'closed' ? 'Clôturé' : 'À prendre'}</span></div><div className="agri-expert-case-body"><div><span className="agri-expert-label">Description terrain</span><p>{caseFile.body}</p>{producerVoice && <div className="agri-expert-attachment"><Mic className="h-4 w-4" /><span>Note vocale du producteur</span><audio controls preload="metadata" src={mediaUrl(producerVoice.id)} /></div>}</div>{photo ? <div className="agri-expert-photo-panel"><div className="agri-expert-photo-frame"><img src={mediaUrl(photo.id)} alt={`Photo du dossier ${caseFile.title}`} /><div className="agri-expert-photo-badges"><span><Camera className="h-3.5 w-3.5" /> HD sécurisé</span><span>{annotationCount} annotation{annotationCount > 1 ? 's' : ''}</span></div>{caseFile.annotations.map((item) => <span key={item.id} className="agri-expert-annotation-mark" title={`${item.label} · ${item.note}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%` }} />)}</div></div> : <div className="agri-expert-no-photo"><ImagePlus className="h-6 w-6" /><span>Aucune photo jointe à ce dossier</span></div>}</div><div className="agri-expert-case-actions"><button type="button" className="agri-expert-primary-action" onClick={() => void performAction({ action: 'accept' })} disabled={Boolean(caseFile.expert_user_id) || busy !== ''}><Check className="h-4 w-4" /> Prendre en charge</button><button type="button" className="agri-expert-secondary-action" onClick={() => void performAction({ action: 'status', status: 'closed' })} disabled={busy !== ''}><CheckCircle2 className="h-4 w-4" /> Clôturer</button><select aria-label="Changer le statut" value={caseFile.case_status ?? 'queued'} onChange={(event) => void performAction({ action: 'status', status: event.target.value as 'in_progress' | 'waiting_producer' | 'answered' | 'closed' })}><option value="in_progress">En cours</option><option value="waiting_producer">En attente producteur</option><option value="answered">Répondu</option><option value="closed">Clôturé</option></select></div><div className="agri-expert-response-box"><div className="agri-expert-label-row"><span className="agri-expert-label">Votre réponse certifiée</span><span>{draft.length}/10 000</span></div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Expliquez les observations, les gestes immédiats et la prochaine étape…" /><div className="agri-expert-response-tools"><AudioRecorder onRecordingChange={setVoice} /><button type="button" className="agri-expert-send" onClick={() => void reply()} disabled={busy !== '' || (!draft.trim() && !voice)}>{busy === 'reply' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer la réponse</button></div></div><div className="agri-expert-followup-grid"><div><span className="agri-expert-label">Demander une information</span><textarea value={infoDraft} onChange={(event) => setInfoDraft(event.target.value)} placeholder="Ex. Pouvez-vous préciser la date d’apparition ?" /><button type="button" className="agri-role-card-link" disabled={!infoDraft.trim() || busy !== ''} onClick={() => void performAction({ action: 'request-info', body: infoDraft })}>Demander au producteur <ArrowRight className="h-4 w-4" /></button></div><div><span className="agri-expert-label">Annoter la photo</span><div className="agri-expert-inline-fields"><input value={annotation.label} onChange={(event) => setAnnotation((current) => ({ ...current, label: event.target.value }))} placeholder="Label : tache, lésion…" /><input value={annotation.note} onChange={(event) => setAnnotation((current) => ({ ...current, note: event.target.value }))} placeholder="Note d’observation" /></div><button type="button" className="agri-role-card-link" disabled={!photo || !annotation.label || busy !== ''} onClick={() => void performAction({ action: 'annotate', mediaAssetId: photo?.id, ...annotation })}><ImagePlus className="h-4 w-4" /> Enregistrer l’annotation</button></div></div><div className="agri-expert-transfer"><span className="agri-expert-label"><Settings2 className="h-4 w-4" /> Transférer le dossier</span><select value={transferTo} onChange={(event) => setTransferTo(event.target.value)}><option value="">Choisir un expert disponible</option>{colleagues.map((colleague) => <option key={colleague.id} value={colleague.id}>{colleague.name}{colleague.is_available ? ' · disponible' : ''}</option>)}</select><button type="button" className="agri-role-card-link" disabled={!transferTo || busy !== ''} onClick={() => void performAction({ action: 'transfer', targetExpertId: Number(transferTo) })}>Transférer <ArrowRight className="h-4 w-4" /></button></div></> : <div className="agri-expert-empty agri-expert-empty-large"><FileText className="h-9 w-9" /><strong>Sélectionnez un dossier</strong><span>La fiche complète du producteur apparaîtra ici.</span></div>}</section></div>
    <section className="agri-expert-history agri-role-work-card"><div className="agri-role-card-head"><div><span>Traçabilité métier</span><h2>Historique du dossier</h2></div><span className="agri-expert-history-note"><MapPin className="h-4 w-4" /> Les événements sont conservés dans D1</span></div>{caseFile?.events.length ? <div className="agri-expert-timeline">{caseFile.events.map((event) => <div key={event.id}><span /><div><strong>{event.action === 'accepted' ? 'Dossier accepté' : event.action === 'replied' ? 'Réponse envoyée' : event.action === 'annotated' ? 'Photo annotée' : event.action === 'transferred' ? 'Dossier transféré' : event.action === 'requested_info' ? 'Information demandée' : 'Statut mis à jour'}</strong><small>{event.actor_name ?? 'Vous'} · {new Date(event.created_at).toLocaleString('fr-FR')}</small></div></div>)}</div> : <p className="agri-expert-empty-line">Les actions du dossier apparaîtront ici.</p>}</section>
  </motion.div>;
}

function InstitutionFeedWorkspace({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (key: NavigationKey) => void }) {
  const [dashboard, setDashboard] = useState<InstitutionalDashboardData | null>(null);
  const [loading, setLoading] = useState(isApiConfigured);
  const [error, setError] = useState('');
  async function refresh() {
    if (!isApiConfigured) { setLoading(false); setError('Le service de données institutionnelles n’est pas configuré ici.'); return; }
    setLoading(true); setError('');
    try { const response = await getInstitutionalDashboard('7d', 'national'); setDashboard(response.data); }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Les données de supervision sont momentanément indisponibles.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const alerts = dashboard?.alerts ?? [];
  const lastUpdated = dashboard ? new Date(dashboard.lastUpdated).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const alertTone = (level: 'critical' | 'high' | 'medium') => level === 'critical' ? 'red' : level === 'high' ? 'gold' : 'blue';
  return <motion.div className="agri-role-page agri-institution-feed-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
    <header className="agri-role-page-hero"><div><button type="button" className="agri-role-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour à la supervision</button><div className="agri-role-eyebrow"><span /> Observatoire · {dashboard?.scope.institutionName ?? 'Périmètre autorisé'}</div><h1>Lire les signaux.<br /><em>Coordonner l’action.</em></h1><p>Indicateurs agrégés de votre périmètre institutionnel, actualisés depuis les données du service.</p></div><div className="agri-role-hero-orb agri-role-hero-orb-institution"><Landmark className="h-7 w-7" /><strong>{loading ? '…' : dashboard?.kpis.activeAlerts ?? '—'}</strong><span>alertes actives · 7 jours</span></div></header>
    {error && <div className="agri-expert-error" role="alert">{error}</div>}
    <div className="agri-role-stat-grid"><RoleFeedStat label="Demandes reçues" value={loading ? '—' : String(dashboard?.kpis.totalRequests ?? 0)} detail="sur les 7 derniers jours" tone="green" /><RoleFeedStat label="Alertes actives" value={loading ? '—' : String(dashboard?.kpis.activeAlerts ?? 0)} detail="signalements SOS ouverts ou attribués" tone="gold" /><RoleFeedStat label="Experts disponibles" value={loading ? '—' : String(dashboard?.kpis.availableExperts ?? 0)} detail="présence récente confirmée" tone="blue" /><RoleFeedStat label="Taux de résolution" value={loading ? '—' : `${dashboard?.kpis.resolutionRate ?? 0}%`} detail="demandes closes ou suivies" tone="violet" /></div>
    <div className="agri-role-work-grid"><section className="agri-role-work-card"><div className="agri-role-card-head"><div><span>Veille des conversations · données agrégées</span><h2>Alertes à examiner</h2>{lastUpdated && <small className="agri-institutional-source-note">Actualisé le {lastUpdated} · 7 derniers jours</small>}</div><button type="button" className="agri-role-card-link" onClick={() => void refresh()} disabled={loading}><Radio className="h-4 w-4" /> {loading ? 'Actualisation…' : 'Actualiser'}</button></div>
      {loading ? <div className="agri-role-empty" role="status"><LoaderCircle className="h-6 w-6 animate-spin" /><strong>Chargement des indicateurs</strong><span>Lecture des données agrégées autorisées pour votre institution.</span></div> : alerts.length ? alerts.slice(0, 6).map((alert, index) => <InstitutionFeedSignal key={`${alert.title}-${alert.region}-${index}`} title={alert.title} detail={`${alert.region} · ${alert.count} · ${alert.time}`} trend={alert.level === 'critical' ? 'Critique' : alert.level === 'high' ? 'Prioritaire' : 'Suivi'} tone={alertTone(alert.level)} />) : <div className="agri-role-empty"><CheckCircle2 className="h-6 w-6" /><strong>Aucune alerte à afficher</strong><span>Aucune alerte agrégée n’est disponible pour cette période et ce périmètre.</span></div>}
      <button type="button" className="agri-role-card-link" onClick={() => onNavigate?.('institutional')}>Ouvrir le cockpit institutionnel <ArrowRight className="h-4 w-4" /></button></section><aside className="agri-role-work-card agri-role-work-card-dark"><div className="agri-role-card-head"><div><span>Périmètre de consultation</span><h2>{dashboard?.scope.institutionName ?? 'Données protégées'}</h2></div><ShieldCheck className="h-5 w-5" /></div><div className="agri-role-decision"><strong>Lecture agrégée et limitée</strong><p>Les données individuelles et les groupes sous le seuil de confidentialité ne sont pas exposés dans cet espace.</p><button type="button" onClick={() => onNavigate?.('institutional')}>Consulter les filtres et rapports <ArrowUpRight className="h-4 w-4" /></button></div></aside></div>
  </motion.div>;
}

function RoleFeedStat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className={`agri-role-stat agri-role-stat-${tone}`}><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>;
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

function EmptyFeed({ isFiltered, onReset, onCreate }: { isFiltered: boolean; onReset: () => void; onCreate: () => void }) {
  return <div className="ag-feed-empty"><span>{isFiltered ? <Search className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}</span><h2>{isFiltered ? 'Aucune discussion trouvée' : 'Le fil attend votre première question'}</h2><p>{isFiltered ? 'Essayez un autre mot-clé ou revenez à l’ensemble du réseau.' : 'Décrivez votre situation pour recevoir un conseil adapté de la communauté.'}</p><button type="button" onClick={isFiltered ? onReset : onCreate}>{isFiltered ? 'Réinitialiser les filtres' : 'Poser une question'} <ArrowRight className="h-3.5 w-3.5" /></button></div>;
}

function FeedLoadingState() {
  return <div className="ag-feed-loading" role="status" aria-label="Chargement des discussions"><span className="ag-feed-loading-skeleton ag-feed-loading-meta" /><span className="ag-feed-loading-skeleton ag-feed-loading-title" /><span className="ag-feed-loading-skeleton ag-feed-loading-copy" /><span className="ag-feed-loading-skeleton ag-feed-loading-copy ag-feed-loading-copy-short" /><span className="ag-feed-loading-skeleton ag-feed-loading-foot" /><span className="sr-only">Chargement des discussions…</span></div>;
}

function FeedErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="ag-feed-empty ag-feed-error-state" role="alert"><span><AlertTriangle className="h-5 w-5" /></span><h2>Le fil n’a pas pu être chargé</h2><p>{message}</p><button type="button" onClick={onRetry}>Réessayer <ArrowRight className="h-3.5 w-3.5" /></button></div>;
}
