import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { newId } from '@shared/utils';
import {
  CommunityMembershipNotFoundError,
  CommunityNotFoundError,
  type Community,
  type CommunityContext,
  type CommunityMembership,
  type CommunityMembershipState,
} from '../domain';
import { CommunityAuthorization } from './authorization';
import { COMMUNITY_REPOSITORY, type CommunityRepository } from './ports/community.repository.port';

@Injectable()
export class GetCommunityUseCase {
  constructor(@Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository) {}

  async execute(reference: string): Promise<Community> {
    const community = await this.repository.findPublishedBySlugOrId(reference);
    if (!community) throw new CommunityNotFoundError(reference);
    return community;
  }
}

@Injectable()
export class GetCommunityContextUseCase {
  constructor(@Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository) {}

  async execute(reference: string): Promise<CommunityContext> {
    const community = await this.repository.findPublishedBySlugOrId(reference);
    if (!community) throw new CommunityNotFoundError(reference);
    const context = await this.repository.getContext(community.id);
    if (!context) throw new CommunityNotFoundError(reference);
    return context;
  }
}

@Injectable()
export class ResolveCommunityContextUseCase {
  constructor(@Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository) {}

  async execute(reference: string | null): Promise<CommunityContext | null> {
    if (!reference) return null;
    const community = await this.repository.findPublishedBySlugOrId(reference);
    if (!community) return null;
    return this.repository.getContext(community.id);
  }
}

@Injectable()
export class ListMyCommunityMembershipsUseCase {
  constructor(
    private readonly authorization: CommunityAuthorization,
    @Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository,
  ) {}

  async execute(actor: Actor): Promise<CommunityMembership[]> {
    await this.authorization.assertCanReadOwnMemberships(actor);
    return this.repository.listMembershipsByUser(actor.id);
  }
}

export interface UpsertMyCommunityMembershipInput {
  state: CommunityMembershipState;
}

@Injectable()
export class UpsertMyCommunityMembershipUseCase {
  constructor(
    private readonly authorization: CommunityAuthorization,
    @Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository,
  ) {}

  async execute(
    actor: Actor,
    communityId: string,
    input: UpsertMyCommunityMembershipInput,
    now = new Date(),
  ): Promise<CommunityMembership> {
    await this.authorization.assertCanUpdateOwnMemberships(actor);
    const community = await this.repository.findPublishedBySlugOrId(communityId);
    if (!community) throw new CommunityNotFoundError(communityId);

    const existing = await this.repository.findMembership(actor.id, community.id);
    if (input.state === 'left' && !existing) {
      throw new CommunityMembershipNotFoundError(community.id);
    }

    return this.repository.saveMembership({
      id: existing?.id ?? newId(),
      communityId: community.id,
      userId: actor.id,
      displayNameSnapshot: actor.displayName,
      role: existing?.role ?? 'member',
      state: input.state,
      joinedAt:
        input.state === 'active' && existing?.state === 'left' ? now : (existing?.joinedAt ?? now),
      leftAt: input.state === 'left' ? now : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }
}
