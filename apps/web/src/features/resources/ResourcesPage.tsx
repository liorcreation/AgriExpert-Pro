import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, CalendarDays, Clock3, Heart, MapPin, MessageCircle, Search, SlidersHorizontal, Star } from 'lucide-react';
import type { NavigationKey } from '../../types/shell';

type ResourceKind = 'guides' | 'directory';

const guides = [
  { id: 'guide-maize', category: 'Agriculture', title: 'Réussir son maïs en 90 jours', description: 'Un itinéraire simple, du choix de la semence à la récolte.', meta: '6 étapes · 12 min', color: 'green', icon: '🌱', tag: 'Le plus consulté' },
  { id: 'guide-cotton', category: 'Agriculture', title: 'Calendrier de fertilisation du coton', description: 'Les bons gestes et les bonnes doses pour chaque phase.', meta: '8 étapes · 16 min', color: 'gold', icon: '✳', tag: 'Saison en cours' },
  { id: 'guide-poultry', category: 'Élevage', title: 'Prévenir les maladies aviaires', description: 'Les protocoles essentiels pour protéger votre basse-cour.', meta: '5 étapes · 9 min', color: 'red', icon: '◌', tag: 'Recommandé' },
  { id: 'guide-fish', category: 'Pisciculture', title: 'Un bassin de tilapias équilibré', description: 'Qualité de l’eau, alimentation et suivi de croissance.', meta: '7 étapes · 14 min', color: 'blue', icon: '≈', tag: 'Nouveau' },
  { id: 'guide-honey', category: 'Apiculture', title: 'Protéger ses ruches pendant la chaleur', description: 'Ombre, ventilation et gestes de prévention.', meta: '4 étapes · 7 min', color: 'orange', icon: '✦', tag: 'Terrain' },
  { id: 'guide-soil', category: 'Agriculture', title: 'Lire son sol avant de semer', description: 'Observer, tester et choisir la bonne stratégie.', meta: '5 étapes · 10 min', color: 'green', icon: '▧', tag: 'Fondamentaux' },
];

const experts = [
  { id: 'expert-awa', name: 'Ing. Awa Kaboré', role: 'Agronome · Cultures vivrières', sector: 'Agronomie', location: 'Ouagadougou · 4,2 km', rating: '4,9', cases: '126 conseils', initials: 'AK', color: 'green', available: true, specialties: ['Maïs', 'Coton', 'Maraîchage'] },
  { id: 'expert-adama', name: 'Dr. Adama Traoré', role: 'Vétérinaire · Élevage', sector: 'Vétérinaire', location: 'Ouagadougou · 2,4 km', rating: '4,8', cases: '98 conseils', initials: 'AT', color: 'gold', available: true, specialties: ['Bovins', 'Ovins', 'Volaille'] },
  { id: 'expert-salif', name: 'Ing. Salif Bamba', role: 'Pisciculteur · Qualité de l’eau', sector: 'Pisciculture', location: 'Bobo-Dioulasso · 6,8 km', rating: '4,7', cases: '74 conseils', initials: 'SB', color: 'blue', available: false, specialties: ['Tilapia', 'Bassins', 'Alimentation'] },
  { id: 'expert-fatou', name: 'Mme Fatou Zongo', role: 'Apicultrice référente', sector: 'Apiculture', location: 'Koudougou · 18 km', rating: '4,9', cases: '51 conseils', initials: 'FZ', color: 'orange', available: true, specialties: ['Ruches', 'Miel', 'Pollinisation'] },
];

export function ResourcesPage({ kind, onBack, onNavigate }: { kind: ResourceKind; onBack: () => void; onNavigate: (key: NavigationKey) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tout');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startedIds, setStartedIds] = useState<string[]>([]);
  const isGuides = kind === 'guides';
  const categories = isGuides ? ['Tout', 'Agriculture', 'Élevage', 'Pisciculture', 'Apiculture'] : ['Tout', 'Agronomie', 'Vétérinaire', 'Pisciculture', 'Apiculture'];
  useEffect(() => {
    setCategory('Tout');
    setQuery('');
    setSelectedId(null);
  }, [kind]);
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (isGuides) return guides.filter((item) => `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(normalizedQuery) && (category === 'Tout' || item.category === category));
    return experts.filter((item) => `${item.name} ${item.role} ${item.specialties.join(' ')}`.toLowerCase().includes(normalizedQuery) && (category === 'Tout' || item.sector === category));
  }, [category, isGuides, query]);

  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <div className="agri-resource-page">
    <button type="button" className="agri-back-link" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Retour au centre de pilotage</button>
    <div className="agri-resource-header"><div><span className="agri-eyebrow"><span className="agri-eyebrow-dot" /> Ressources AgriExpert</span><h1 className="agri-display-title">{isGuides ? 'Fiches techniques' : 'Annuaire des experts'}</h1><p className="agri-intro">{isGuides ? 'Des itinéraires lisibles, pensés pour décider vite et agir juste sur le terrain.' : 'Les spécialistes certifiés disponibles autour de vos parcelles et de vos troupeaux.'}</p></div><div className="agri-resource-header-stat"><strong>{isGuides ? '42' : '148'}</strong><span>{isGuides ? 'guides validés' : 'experts référencés'}</span></div></div>
    <div className="agri-resource-toolbar"><div className="agri-resource-search"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isGuides ? 'Rechercher une culture, une maladie…' : 'Rechercher un spécialiste…'} aria-label="Rechercher" /></div><div className="agri-resource-filters"><SlidersHorizontal className="h-4 w-4" />{categories.map((item) => <button type="button" key={item} className={category === item ? 'agri-filter-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    <div className="agri-resource-result-row"><span>{visible.length} résultat{visible.length > 1 ? 's' : ''}</span><span className="agri-result-status"><span /> Données vérifiées</span></div>
    <div className={isGuides ? 'agri-resource-grid' : 'agri-expert-grid'}>{visible.map((item, index) => <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }}><ResourceCard item={item} isGuide={isGuides} favorite={favorites.includes(item.id)} selected={selectedId === item.id} started={startedIds.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onSelect={() => setSelectedId(selectedId === item.id ? null : item.id)} onStart={() => setStartedIds((current) => current.includes(item.id) ? current : [...current, item.id])} onContact={() => onNavigate('feed')} /></motion.div>)}</div>
    {visible.length === 0 && <div className="agri-empty-state"><Search className="h-7 w-7" /><h2>Aucun résultat</h2><p>Essayez un autre terme ou réinitialisez le filtre.</p><button type="button" onClick={() => { setQuery(''); setCategory('Tout'); }}>Réinitialiser</button></div>}
  </div>;
}

function ResourceCard({ item, isGuide, favorite, selected, started, onFavorite, onSelect, onStart, onContact }: { item: (typeof guides)[number] | (typeof experts)[number]; isGuide: boolean; favorite: boolean; selected: boolean; started: boolean; onFavorite: () => void; onSelect: () => void; onStart: () => void; onContact: () => void }) {
  if (isGuide) {
    const guide = item as (typeof guides)[number];
    return <article className="agri-resource-card"><div className={`agri-resource-visual agri-visual-${guide.color}`}><span className="agri-resource-emoji">{guide.icon}</span><button type="button" className={favorite ? 'agri-favorite agri-favorite-active' : 'agri-favorite'} onClick={onFavorite} aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={favorite}><Heart className="h-4 w-4" /></button><span className="agri-resource-tag">{guide.tag}</span></div><div className="agri-resource-card-body"><span className="agri-resource-category">{guide.category}</span><h2>{guide.title}</h2><p>{guide.description}</p><div className="agri-resource-meta"><span><BookOpen className="h-3.5 w-3.5" /> {guide.meta}</span><button type="button" onClick={onSelect}>{selected ? 'Fermer' : 'Ouvrir'} <ArrowRight className="h-3.5 w-3.5" /></button></div>{selected && <div className="agri-resource-expanded"><span><CalendarDays className="h-3.5 w-3.5" /> Parcours pas à pas</span><span><Clock3 className="h-3.5 w-3.5" /> Accessible hors connexion</span><button type="button" onClick={onStart}>{started ? 'Fiche ajoutée à mon parcours' : 'Commencer la fiche'} <ArrowRight className="h-3.5 w-3.5" /></button>{started && <span className="agri-resource-started"><BadgeCheck className="h-3.5 w-3.5" /> Progression enregistrée sur cet appareil</span>}</div>}</div></article>;
  }
  const expert = item as (typeof experts)[number];
  return <article className="agri-expert-card"><div className="agri-expert-head"><span className={`agri-expert-avatar agri-avatar-${expert.color}`}>{expert.initials}</span><button type="button" className={favorite ? 'agri-favorite agri-favorite-active' : 'agri-favorite'} onClick={onFavorite} aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={favorite}><Heart className="h-4 w-4" /></button></div><div className="agri-expert-main"><div className="agri-expert-name"><h2>{expert.name}</h2><BadgeCheck className="h-4 w-4" /></div><p>{expert.role}</p><span className="agri-expert-location"><MapPin className="h-3.5 w-3.5" /> {expert.location}</span><div className="agri-expert-tags">{expert.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)}</div></div><div className="agri-expert-footer"><span className="agri-expert-rating"><Star className="h-3.5 w-3.5" /> {expert.rating} <em>· {expert.cases}</em></span><span className={expert.available ? 'agri-available' : 'agri-unavailable'}><span /> {expert.available ? 'En ligne' : 'Hors ligne'}</span></div>{selected && <div className="agri-expert-actions"><button type="button" onClick={onContact}><MessageCircle className="h-3.5 w-3.5" /> Poser une question</button><button type="button" onClick={onSelect}>Fermer le profil <ArrowRight className="h-3.5 w-3.5" /></button></div>}{!selected && <button type="button" className="agri-expert-open" onClick={onSelect}>Voir le profil <ArrowRight className="h-3.5 w-3.5" /></button>}</article>;
}
