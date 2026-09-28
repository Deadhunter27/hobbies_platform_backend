export const COMMUNITY_STATUSES = ['draft', 'published', 'archived'] as const;
export type CommunityStatus = (typeof COMMUNITY_STATUSES)[number];

export const COMMUNITY_MEMBERSHIP_ROLES = ['member', 'host', 'organizer'] as const;
export type CommunityMembershipRole = (typeof COMMUNITY_MEMBERSHIP_ROLES)[number];

export const COMMUNITY_MEMBERSHIP_STATES = ['active', 'left'] as const;
export type CommunityMembershipState = (typeof COMMUNITY_MEMBERSHIP_STATES)[number];

export interface Community {
  id: string;
  hobbyId: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  countryCode: string | null;
  status: CommunityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  displayNameSnapshot: string;
  role: CommunityMembershipRole;
  state: CommunityMembershipState;
  joinedAt: Date;
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityPeopleContext {
  memberCount: number;
  hosts: CommunityMembership[];
}

export interface CommunityContext {
  community: Community;
  people: CommunityPeopleContext;
}
