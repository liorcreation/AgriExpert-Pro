import type { FeedCategory, FeedQuestion } from '../types/feed';

export const feedCategoryLabels: Record<FeedCategory, string> = {
  agriculture: 'Agriculture',
  livestock: 'Élevage / Vétérinaire',
  aquaculture: 'Pisciculture',
  apiculture: 'Apiculture',
};

export const categoryAccent: Record<FeedCategory, string> = {
  agriculture: 'bg-territory-50 text-territory-700 dark:bg-territory-500/10 dark:text-territory-300',
  livestock: 'bg-gold-100 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300',
  aquaculture: 'bg-medical-50 text-medical-600 dark:bg-medical-500/10 dark:text-medical-500',
  apiculture: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
};

export const initialQuestions: FeedQuestion[] = [
  {
    id: 'question-1',
    category: 'agriculture',
    title: 'Les feuilles de mon maïs jaunissent depuis une semaine',
    body: 'Les plants ont bien démarré mais les feuilles du bas deviennent jaunes. La parcelle a reçu la première fertilisation il y a 12 jours. Que dois-je vérifier en priorité ?',
    authorName: 'Mariam Ouedraogo',
    authorLocation: 'Koudougou · Centre-Ouest',
    createdAt: 'Il y a 18 min',
    hasVoice: true,
    answerCount: 2,
    answer: {
      id: 'answer-1',
      expertName: 'Ing. Awa Kaboré',
      expertRole: 'Agronome certifiée · 12 ans d’expérience',
      initials: 'AK',
      body: 'Le jaunissement des feuilles basses peut indiquer une carence en azote ou un excès d’eau. Vérifiez d’abord l’humidité du sol à 10 cm et observez si les nervures restent vertes. Évitez une nouvelle dose d’engrais avant cette vérification.',
      language: 'fr',
      certified: true,
      createdAt: 'Il y a 9 min',
    },
  },
  {
    id: 'question-2',
    category: 'livestock',
    title: 'Deux moutons ont de la fièvre et refusent de manger',
    body: 'Les symptômes sont apparus ce matin dans le même enclos. Ils boivent encore mais restent couchés. Aucun nouvel animal n’a été introduit récemment.',
    authorName: 'Issaka Sawadogo',
    authorLocation: 'Kaya · Centre-Nord',
    createdAt: 'Il y a 42 min',
    hasVoice: false,
    answerCount: 1,
    answer: {
      id: 'answer-2',
      expertName: 'Dr. Adama Traoré',
      expertRole: 'Vétérinaire praticien · Élevage',
      initials: 'AT',
      body: 'Isolez les deux animaux dans un espace ombragé et propre, puis mesurez leur température si vous avez un thermomètre. Ne donnez pas d’antibiotique sans examen. Je vous recommande une visite prioritaire si la fièvre dépasse 40 °C.',
      language: 'fr',
      certified: true,
      createdAt: 'Il y a 21 min',
    },
  },
  {
    id: 'question-3',
    category: 'aquaculture',
    title: 'Mortalité inhabituelle dans mon bassin de tilapias',
    body: 'La mortalité a commencé après une forte pluie. L’eau est devenue trouble et les poissons remontent souvent à la surface.',
    authorName: 'Boubacar Diallo',
    authorLocation: 'Bobo-Dioulasso · Hauts-Bassins',
    createdAt: 'Il y a 2 h',
    hasVoice: true,
    answerCount: 3,
  },
  {
    id: 'question-4',
    category: 'apiculture',
    title: 'Comment protéger les ruches pendant la période chaude ?',
    body: 'Les abeilles sortent moins aux heures les plus chaudes et la cire semble se ramollir. Les ruches sont exposées au soleil de l’après-midi.',
    authorName: 'Fatimata Zongo',
    authorLocation: 'Ouagadougou · Centre',
    createdAt: 'Hier, 15:25',
    hasVoice: false,
    answerCount: 0,
  },
];
