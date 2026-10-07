import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, Camera, Check, CheckCircle2, ChevronDown, CircleDot, Clock3, Filter, FileText, Flame, HelpCircle, ImagePlus, Landmark, LoaderCircle, MapPin, MessageCircle, Mic, Plus, Radio, Search, Send, Settings2, ShieldCheck, Sparkles, TrendingUp, UserRound, UsersRound, X } from 'lucide-react';
import { initialQuestions, feedCategoryLabels } from '../../data/feed';
import { QuestionCard } from '../../components/feed/QuestionCard';
import { QuestionComposer } from '../../components/feed/QuestionComposer';
import type { FeedCategory, FeedQuestion } from '../../types/feed';
import type { UserRole } from '../../types/shell';
import type { NavigationKey } from '../../types/shell';
import { AudioRecorder } from '../../components/emergencies/AudioRecorder';
import { countPendingOfflineDrafts, queueOfflineDraft, syncOfflineDrafts } from '../../lib/offlineQueue';
import { answerQuestion, getExpertCase, getExpertWorkspace, isApiConfigured, listExpertColleagues, listQuestions, mediaUrl, publishQuestion, reactToQuestion, updateEmergencyAvailability, updateExpertCase, uploadMedia, type ExpertCase, type ExpertWorkspaceData, type PersistedQuestion } from '../../lib/api';

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

export function FeedPage({ role, onBack, onNavigate }: { role: UserRole; onBack: () => void; onNavigate?: (key: NavigationKey) => void }) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [search, setSearch] = useState('');
  const [questions, setQuestions] = useState<FeedQuestion[]>(isApiConfigured ? [] : initialQuestions);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortByAnswers, setSortByAnswers] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);

  async function refreshOfflineCount() {
    setOfflineCount(await countPendingOfflineDrafts());
  }

  async function refreshQuestions() {
    if (!isApiConfigured) return;
    try {
      const response = await listQuestions();
      setQuestions(response.data.map(mapPersistedQuestion));
    } catch {
      // Keep the current feed visible when a transient network error occurs.
    }
  }

  useEffect(() => { void refreshOfflineCount(); }, []);

  useEffect(() => {
    if (!isApiConfigured) return;
    void refreshQuestions();
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncOfflineDrafts();
      await Promise.all([refreshOfflineCount(), refreshQuestions()]);
    };
    const handleOffline = () => setIsOnline(false);
    const handleBackgroundSync = () => {
      void syncOfflineDrafts().then(async () => {
        await Promise.all([refreshOfflineCount(), refreshQuestions()]);
      });
    };
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline); window.addEventListener('agriexpert:offline-sync', handleBackgroundSync);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); window.removeEventListener('agriexpert:offline-sync', handleBackgroundSync); };
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

  async function addQuestion(payload: { title: string; body: string; category: FeedCategory; hasVoice: boolean; hasPhoto: boolean; photo?: File; voice?: Blob; photoName?: string; photoPreview?: string; photoAssetId?: number; diagnosisId?: number }) {
    const clientRequestId = `question-${crypto.randomUUID()}`;
    if (isOnline && isApiConfigured) {
      try {
        const attachments = await Promise.all([
          payload.photoAssetId ? null : payload.photo ? uploadMedia(payload.photo, 'photo', payload.photo.name, `${clientRequestId}:photo`) : null,
          payload.voice ? uploadMedia(payload.voice, 'voice', 'question.webm', `${clientRequestId}:voice`) : null,
        ]);
        const response = await publishQuestion({ title: payload.title, body: payload.body, category: payload.category, hasVoice: payload.hasVoice, hasPhoto: payload.hasPhoto, photoName: payload.photoName, diagnosisId: payload.diagnosisId, clientRequestId, attachmentIds: [payload.photoAssetId, ...attachments.flatMap((item) => item ? [item.data.id] : [])].filter((item): item is number => Number.isInteger(item)) });
        setQuestions((current) => [mapPersistedQuestion(response.data), ...current]);
        setComposerOpen(false);
        return;
      } catch {
        // Keep the question locally and retry when the network is back.
      }
    }
    const newQuestion: FeedQuestion = { id: `question-${Date.now()}`, title: payload.title, body: payload.body, category: payload.category, hasVoice: payload.hasVoice, hasPhoto: payload.hasPhoto, photoName: payload.photoName, photoPreview: payload.photoPreview, authorName: 'Vous', authorLocation: 'Votre exploitation', createdAt: 'À l’instant', answerCount: 0 };
    setQuestions((current) => [newQuestion, ...current]);
    await queueOfflineDraft({ clientRequestId, title: payload.title, body: payload.body, category: payload.category, hasVoice: payload.hasVoice, hasPhoto: payload.hasPhoto, photo: payload.photo, voice: payload.voice, photoName: payload.photoName, voiceName: 'question.webm' });
    await refreshOfflineCount();
    setComposerOpen(false);
  }

  function openComposer() {
    setComposerOpen(true);
    window.setTimeout(() => document.getElementById('question-title')?.focus(), 80);
  }

  if (role === 'expert') return <ExpertOperationsWorkspace onBack={onBack} onNavigate={onNavigate} />;
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
          <div className="ag-feed-question-list">{visibleQuestions.length > 0 ? visibleQuestions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} onReply={openComposer} onReaction={async (reacted) => { if (!isApiConfigured || !/^\d+$/.test(question.id)) return; const result = await reactToQuestion(question.id, reacted); setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, reacted, usefulCount: result.data.useful_count } : item)); }} />) : <EmptyFeed onReset={() => { setSearch(''); setFilter('all'); }} />}</div>
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
    try { if (voice) voiceAssetId = (await uploadMedia(voice, 'voice', 'reponse-expert.webm')).data.id; await performAction({ action: 'reply', body: draft.trim() || 'Réponse vocale jointe.', language: 'fr', voiceAssetId }); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Envoi de la réponse impossible.'); setBusy(''); }
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

function ExpertFeedWorkspace({ onBack }: { onBack: () => void }) {
  return <motion.div className="agri-role-page agri-expert-feed-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
    <header className="agri-role-page-hero"><div><button type="button" className="agri-role-back" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour à mon espace expert</button><div className="agri-role-eyebrow"><span /> File d’expertise · Réseau actif</div><h1>Les producteurs attendent.<br /><em>Votre expertise agit.</em></h1><p>Qualifier les demandes, prioriser les urgences et apporter une réponse certifiée depuis un seul espace de travail.</p></div><div className="agri-role-hero-orb agri-role-hero-orb-expert"><BriefcaseBusiness className="h-7 w-7" /><strong>12</strong><span>demandes à traiter</span></div></header>
    <div className="agri-role-stat-grid"><RoleFeedStat label="À qualifier" value="12" detail="4 prioritaires" tone="green" /><RoleFeedStat label="Réponses cette semaine" value="38" detail="+18% vs. semaine passée" tone="gold" /><RoleFeedStat label="Délai moyen" value="18 min" detail="objectif réseau · 30 min" tone="blue" /><RoleFeedStat label="Satisfaction" value="4,9/5" detail="74 avis producteurs" tone="violet" /></div><ExpertAnswerQueue /><section className="agri-diagnostic-card"><div className="agri-diagnostic-copy"><span className="agri-role-eyebrow"><span /> Vision terrain · Diagnostic assisté</span><h2>Une photo, des indices exploitables.</h2><p>Les producteurs peuvent joindre une image HD de la plante ou de l’animal. Qualifiez les symptômes, annotez l’observation et envoyez votre première hypothèse.</p><div className="agri-diagnostic-tags"><span>HD sécurisé</span><span>Annotation expert</span><span>Historique du cas</span></div></div><div className="agri-diagnostic-visual"><div className="agri-diagnostic-leaf">◒</div><span>Photo reçue · Maïs · 4,2 Mo</span><b>À analyser</b></div></section>
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

function ExpertAnswerQueue() {
  const [questions, setQuestions] = useState<PersistedQuestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (isApiConfigured) void listQuestions().then((response) => setQuestions(response.data.filter((question) => question.status === 'open'))).catch(() => undefined); }, []);
  async function submit(questionId: number) {
    const body = drafts[String(questionId)]?.trim();
    if (!body) return;
    setBusy(String(questionId));
    try { await answerQuestion(String(questionId), body); setQuestions((current) => current.filter((question) => question.id !== questionId)); setDrafts((current) => ({ ...current, [String(questionId)]: '' })); } finally { setBusy(null); }
  }
  return <section className="agri-role-work-card agri-expert-answer-queue"><div className="agri-role-card-head"><div><span>Persistance active · D1</span><h2>Répondre aux demandes ouvertes</h2></div><span className="agri-role-live"><i /> {questions.length} à traiter</span></div>{questions.length ? questions.slice(0, 3).map((question) => <div className="agri-expert-answer-item" key={question.id}><div><strong>{question.title}</strong><small>{question.category} · {question.author_name} · {question.created_at}</small></div><textarea value={drafts[String(question.id)] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [String(question.id)]: event.target.value }))} placeholder="Votre réponse terrain certifiée…" /><button type="button" className="agri-role-card-link" disabled={busy === String(question.id)} onClick={() => void submit(question.id)}>{busy === String(question.id) ? 'Envoi…' : 'Publier la réponse'} <ArrowRight className="h-4 w-4" /></button></div>) : <p className="agri-role-empty">Aucune demande ouverte pour le moment.</p>}</section>;
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
