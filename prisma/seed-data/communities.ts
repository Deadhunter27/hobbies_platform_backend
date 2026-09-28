export interface CommunityMemberSeed {
  id: string;
  userId: string;
  displayNameSnapshot: string;
  role: 'member' | 'host' | 'organizer';
}

export interface CommunitySeed {
  id: string;
  hobbySlug: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  countryCode: string;
  members: CommunityMemberSeed[];
}

export const JAKARTA_RUNNERS_COMMUNITY_ID = '01K6C000000000000000000001';
export const JAKARTA_RUNNERS_ORGANIZER_ID = '01K6P000000000000000000001';

export const communitySeeds: CommunitySeed[] = [
  {
    id: JAKARTA_RUNNERS_COMMUNITY_ID,
    hobbySlug: 'running',
    name: 'Jakarta Runners',
    slug: 'jakarta-runners',
    description:
      'A welcoming Jakarta running community for easy social runs, consistency, and meeting people without pace pressure.',
    city: 'Jakarta',
    countryCode: 'ID',
    members: [
      {
        id: '01K6M000000000000000000001',
        userId: JAKARTA_RUNNERS_ORGANIZER_ID,
        displayNameSnapshot: 'Dimas · Jakarta Runners',
        role: 'organizer',
      },
      {
        id: '01K6M000000000000000000002',
        userId: '01K6P000000000000000000002',
        displayNameSnapshot: 'Nadia · Jakarta Runners',
        role: 'host',
      },
    ],
  },
];
