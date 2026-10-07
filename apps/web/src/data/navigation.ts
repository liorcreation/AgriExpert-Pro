import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  Building2,
  Compass,
  CreditCard,
  LayoutDashboard,
  MapPinned,
  Siren,
  UsersRound,
} from 'lucide-react';
import type { NavigationKey, UserRole } from '../types/shell';

export type NavigationItem = {
  key: NavigationKey;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

export const primaryNavigation: NavigationItem[] = [
  {
    key: 'overview',
    label: 'Vue d’ensemble',
    description: 'Votre espace de pilotage',
    icon: LayoutDashboard,
  },
  {
    key: 'feed',
    label: 'Fil d’échanges',
    description: 'Conseils et réponses certifiées',
    icon: UsersRound,
    badge: '12',
  },
  {
    key: 'emergency',
    label: 'SOS Agropastoral',
    description: 'Urgences vétérinaires et phytosanitaires',
    icon: Siren,
    badge: 'Urgent',
  },
  {
    key: 'guides',
    label: 'Fiches techniques',
    description: 'Guides et itinéraires de production',
    icon: BookOpen,
  },
  {
    key: 'directory',
    label: 'Annuaire des experts',
    description: 'Spécialistes et laboratoires proches',
    icon: Compass,
  },
  { key: 'billing', label: 'Offres & facturation', description: 'Votre formule et vos paiements', icon: CreditCard },
];

export const institutionalNavigation: NavigationItem[] = [
  {
    key: 'institutional',
    label: 'Pilotage institutionnel',
    description: 'Indicateurs et alertes territoriales',
    icon: Building2,
  },
];

const expertNavigation: NavigationItem[] = [
  { key: 'overview', label: 'Mon espace expert', description: 'Votre activité et vos priorités', icon: LayoutDashboard },
  { key: 'feed', label: 'Demandes à traiter', description: 'Conseils et réponses à qualifier', icon: UsersRound, badge: '12' },
  { key: 'emergency', label: 'Interventions SOS', description: 'Urgences proches à accompagner', icon: Siren, badge: '4' },
  { key: 'guides', label: 'Base technique', description: 'Référentiels et itinéraires validés', icon: BookOpen },
  { key: 'directory', label: 'Réseau d’experts', description: 'Spécialistes et relais terrain', icon: Compass },
  { key: 'billing', label: 'Offres & facturation', description: 'Votre formule et vos paiements', icon: CreditCard },
];

const institutionNavigation: NavigationItem[] = [
  { key: 'overview', label: 'Vue de supervision', description: 'Les signaux essentiels du territoire', icon: LayoutDashboard },
  { key: 'institutional', label: 'Pilotage institutionnel', description: 'Indicateurs et alertes territoriales', icon: Building2 },
  { key: 'emergency', label: 'Veille sanitaire', description: 'Foyers et urgences prioritaires', icon: Siren, badge: '67' },
  { key: 'directory', label: 'Réseau mobilisable', description: 'Experts et laboratoires disponibles', icon: Compass },
  { key: 'guides', label: 'Référentiels nationaux', description: 'Fiches et protocoles de campagne', icon: BookOpen },
  { key: 'billing', label: 'Contrats & facturation', description: 'Offres institutionnelles', icon: CreditCard },
];

export const roleNavigation: Record<UserRole, NavigationItem[]> = { producer: primaryNavigation, expert: expertNavigation, institution: institutionNavigation };

export const roleNavigationLabels: Record<UserRole, string> = { producer: 'Votre espace', expert: 'Votre activité', institution: 'Supervision nationale' };

export const roleLabels = {
  producer: 'Producteur',
  expert: 'Expert',
  institution: 'Institution',
} as const;

export const roleDescriptions = {
  producer: 'Accéder à vos conseils et exploitations',
  expert: 'Traiter les demandes qui vous sont confiées',
  institution: 'Superviser les indicateurs territoriaux',
} as const;

export const statusPulseIcon = Activity;
export const locationIcon = MapPinned;
