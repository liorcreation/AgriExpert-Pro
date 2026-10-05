export type UserRole = 'producer' | 'expert' | 'institution';

export type ProducerProfile = 'farmer' | 'livestock' | 'fish-farmer' | 'beekeeper';
export type ExpertProfile = 'agronomist' | 'veterinarian' | 'aquaculture-specialist' | 'beekeeping-advisor';
export type SubscriptionPlan = 'free' | 'pro' | 'institution';

export type ProfileSpecialty = ProducerProfile | ExpertProfile;

export type LanguageCode = 'fr' | 'mo';

export type NavigationKey =
  | 'overview'
  | 'feed'
  | 'emergency'
  | 'guides'
  | 'directory'
  | 'institutional';
