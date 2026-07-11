import type { HobbyCostLevel, HobbyDifficulty, HobbySetting } from '@prisma/client';

export interface HobbySeed {
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  difficulty: HobbyDifficulty;
  costLevel: HobbyCostLevel;
  setting: HobbySetting;
}

export const hobbySeeds: HobbySeed[] = [
  {
    slug: 'running',
    name: 'Running',
    description: 'Lace up and go — the lowest-barrier endurance hobby there is.',
    categorySlug: 'sports-and-movement',
    difficulty: 'beginner_friendly',
    costLevel: 'free',
    setting: 'outdoor',
  },
  {
    slug: 'padel',
    name: 'Padel',
    description: 'A fast-growing racquet sport played in doubles on an enclosed court.',
    categorySlug: 'sports-and-movement',
    difficulty: 'moderate',
    costLevel: 'medium',
    setting: 'outdoor',
  },
  {
    slug: 'photography',
    name: 'Photography',
    description: 'Learning to see, and capturing what you see with a camera.',
    categorySlug: 'creative-arts',
    difficulty: 'moderate',
    costLevel: 'medium',
    setting: 'both',
  },
  {
    slug: 'pottery',
    name: 'Pottery',
    description: 'Shaping clay by hand or on a wheel into functional and decorative pieces.',
    categorySlug: 'creative-arts',
    difficulty: 'moderate',
    costLevel: 'medium',
    setting: 'indoor',
  },
  {
    slug: 'hiking',
    name: 'Hiking',
    description: 'Walking trails of all lengths, from a local park loop to a multi-day trek.',
    categorySlug: 'outdoors-and-nature',
    difficulty: 'beginner_friendly',
    costLevel: 'free',
    setting: 'outdoor',
  },
  {
    slug: 'birdwatching',
    name: 'Birdwatching',
    description: 'Identifying and observing wild birds in their habitat.',
    categorySlug: 'outdoors-and-nature',
    difficulty: 'beginner_friendly',
    costLevel: 'low',
    setting: 'outdoor',
  },
];
