export type FeedCategory = 'agriculture' | 'livestock' | 'aquaculture' | 'apiculture';

export type FeedAnswer = {
  id: string;
  expertName: string;
  expertRole: string;
  initials: string;
  body: string;
  language: 'fr' | 'mo';
  certified: boolean;
  createdAt: string;
};

export type FeedQuestion = {
  id: string;
  category: FeedCategory;
  title: string;
  body: string;
  authorName: string;
  authorLocation: string;
  createdAt: string;
  hasVoice: boolean;
  hasPhoto?: boolean;
  photoName?: string;
  photoPreview?: string;
  answerCount: number;
  usefulCount?: number;
  reacted?: boolean;
  answer?: FeedAnswer;
};
