export interface ActivitySeed {
  id: string;
  hobbySlug: string;
  title: string;
  description: string;
  activityType: string;
  startOffsetDays: number;
  durationMinutes: number;
  timezone: string;
  placeName: string;
  addressLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  hostName: string | null;
  hostType: string | null;
  effortLevel: 'easy' | 'moderate' | 'challenging' | 'open';
  capacity: number | null;
  preparation: string;
  expectations: string;
}

export const activitySeeds: ActivitySeed[] = [
  {
    id: '01K6A000000000000000000001',
    hobbySlug: 'running',
    title: 'Sunday Social 5K',
    description: 'A relaxed group run designed to make showing up alone feel normal.',
    activityType: 'group_run',
    startOffsetDays: 7,
    durationMinutes: 60,
    timezone: 'Asia/Jakarta',
    placeName: 'GBK Main Gate',
    addressLabel: 'Gelora Bung Karno, Jakarta',
    latitude: -6.2181,
    longitude: 106.8023,
    hostName: 'Jakarta Runners',
    hostType: 'community',
    effortLevel: 'easy',
    capacity: 40,
    preparation: 'Wear comfortable running shoes and bring water. Walking breaks are welcome.',
    expectations:
      'Easy conversational pace, newcomer-friendly host, and a short regroup after the run.',
  },
  {
    id: '01K6A000000000000000000002',
    hobbySlug: 'running',
    title: 'Relaxed 5K at GBK',
    description: 'An easy-paced 5K with no pace target and room for walking breaks.',
    activityType: 'guided_run',
    startOffsetDays: 4,
    durationMinutes: 60,
    timezone: 'Asia/Jakarta',
    placeName: 'GBK Main Gate',
    addressLabel: 'Gelora Bung Karno, Jakarta',
    latitude: -6.2181,
    longitude: 106.8023,
    hostName: 'Wayfinder Running Guide',
    hostType: 'guide',
    effortLevel: 'easy',
    capacity: 20,
    preparation: 'Start slower than you think you need to. Walking breaks are completely fine.',
    expectations: 'Finish comfortable; the purpose is to build confidence, not chase pace.',
  },
  {
    id: '01K6A000000000000000000003',
    hobbySlug: 'running',
    title: '20-minute easy run/walk',
    description: 'A smaller self-directed option when the original plan feels like too much.',
    activityType: 'self_guided_run_walk',
    startOffsetDays: 2,
    durationMinutes: 20,
    timezone: 'Asia/Jakarta',
    placeName: 'Near you',
    addressLabel: null,
    latitude: null,
    longitude: null,
    hostName: null,
    hostType: null,
    effortLevel: 'easy',
    capacity: null,
    preparation:
      'Choose a familiar nearby route. Alternate easy running and walking whenever needed.',
    expectations: 'No pace target. The win is finding a version you can actually do.',
  },
  {
    id: '01K6A000000000000000000004',
    hobbySlug: 'running',
    title: '5K with one pacing cue',
    description: 'A self-guided 5K focused on learning sustainable effort rather than chasing pace.',
    activityType: 'self_guided_pacing_run',
    startOffsetDays: 5,
    durationMinutes: 50,
    timezone: 'Asia/Jakarta',
    placeName: 'Your usual route',
    addressLabel: null,
    latitude: null,
    longitude: null,
    hostName: 'Self-guided',
    hostType: 'self',
    effortLevel: 'moderate',
    capacity: null,
    preparation: 'Start the first kilometre deliberately controlled and keep one pacing cue in mind.',
    expectations: 'Notice where effort changes across the run instead of chasing a personal best.',
  },
];
