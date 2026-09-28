import type { TxContext } from '@shared/application';
import type {
  Community,
  CommunityContext,
  CommunityMembership,
  CommunityStatus,
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
  findById(id: string, tx?: TxContext): Promise<Community | null>;
  getContext(communityId: string): Promise<CommunityContext | null>;
  findMembership(userId: string, communityId: string): Promise<CommunityMembership | null>;
  listMembershipsByUser(userId: string): Promise<CommunityMembership[]>;
  saveMembership(input: SaveCommunityMembershipInput): Promise<CommunityMembership>;
  updateStatus(
    input: { id: string; status: CommunityStatus; updatedAt: Date },
    tx?: TxContext,
  ): Promise<Community | null>;
}
