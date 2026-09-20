import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  Building2,
  Compass,
  LayoutDashboard,
  MapPinned,
  Siren,
  UsersRound,
} from 'lucide-react';
import type { NavigationKey } from '../types/shell';

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
];

export const institutionalNavigation: NavigationItem[] = [
  {
    key: 'institutional',
    label: 'Pilotage institutionnel',
    description: 'Indicateurs et alertes territoriales',
    icon: Building2,
  },
];

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
