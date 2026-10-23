import type {
  Community,
  CommunityContext,
  CommunityMembership,
  CommunitySummary,
} from '../../domain';

export const COMMUNITY_REPOSITORY = Symbol('COMMUNITY_REPOSITORY');

export interface SaveCommunityMembershipInput {
  id: string;
  communityId: string;
  userId: string;
  displayNameSnapshot: string;
  role: CommunityMembership['role'];
  state: CommunityMembership['state'];
  joinedAt: Date;
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityRepository {
  findPublishedBySlugOrId(reference: string): Promise<Community | null>;
  getContext(communityId: string): Promise<CommunityContext | null>;
  findMembership(userId: string, communityId: string): Promise<CommunityMembership | null>;
  listMembershipsByUser(userId: string): Promise<CommunityMembership[]>;
  saveMembership(input: SaveCommunityMembershipInput): Promise<CommunityMembership>;
  /** Creates a community and its organizer membership atomically. */
  createWithOrganizer(community: Community, organizer: SaveCommunityMembershipInput): Promise<void>;
  listPublished(input: {
    hobbyId: string | null;
    query: string | null;
    limit: number;
    cursor: { name: string; id: string } | null;
  }): Promise<CommunitySummary[]>;
}
