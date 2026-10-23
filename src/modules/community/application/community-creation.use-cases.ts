import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import { CreatorEligibilityService } from '@modules/profile';
import { InvalidCursorError } from '@shared/errors';
import { decodeCursor, encodeCursor, newId } from '@shared/utils';
import {
  communitySlug,
  type CommunityContext,
  type CommunityMembershipRole,
  type CommunitySummary,
} from '../domain';
import { COMMUNITY_REPOSITORY, type CommunityRepository } from './ports/community.repository.port';
import { GetCommunityContextUseCase } from './community.use-cases';

export interface CreateCommunityInput {
  hobbyId: string;
  name: string;
  description: string | null;
  city: string | null;
}

/** ADR-0035: anyone allowed by the creation policy can start a community and organizes it. */
@Injectable()
export class CreateCommunityUseCase {
  constructor(
    private readonly eligibility: CreatorEligibilityService,
    private readonly getHobby: GetHobbyUseCase,
    @Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository,
    private readonly getContext: GetCommunityContextUseCase,
  ) {}

  async execute(
    actor: Actor,
    input: CreateCommunityInput,
    now = new Date(),
  ): Promise<CommunityContext> {
    await this.eligibility.assertCanCreate(actor, 'community');
    const hobby = await this.getHobby.execute({ slugOrId: input.hobbyId });
    const id = newId();
    await this.repository.createWithOrganizer(
      {
        id,
        hobbyId: hobby.id,
        name: input.name.trim(),
        slug: communitySlug(input.name, id.slice(-6)),
        description: input.description?.trim() || null,
        city: input.city?.trim() || null,
        countryCode: null,
        status: 'published',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: newId(),
        communityId: id,
        userId: actor.id,
        displayNameSnapshot: actor.displayName,
        role: 'organizer',
        state: 'active',
        joinedAt: now,
        leftAt: null,
        createdAt: now,
        updatedAt: now,
      },
    );
    return this.getContext.execute(id);
  }
}

@Injectable()
export class ListCommunitiesUseCase {
  constructor(@Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository) {}

  async execute(input: {
    hobbyId?: string;
    query?: string;
    limit: number;
    cursor?: string;
  }): Promise<{ data: CommunitySummary[]; nextCursor: string | null }> {
    let cursor: { name: string; id: string } | null = null;
    if (input.cursor) {
      const decoded = decodeCursor(input.cursor);
      if (!decoded.name) throw new InvalidCursorError();
      cursor = { name: decoded.name, id: decoded.id };
    }
    const rows = await this.repository.listPublished({
      hobbyId: input.hobbyId ?? null,
      query: input.query?.trim() || null,
      limit: input.limit + 1,
      cursor,
    });
    const page = rows.slice(0, input.limit);
    const last = page.at(-1);
    return {
      data: page,
      nextCursor:
        rows.length > input.limit && last
          ? encodeCursor({ name: last.community.name, id: last.community.id })
          : null,
    };
  }
}

/** Public seam: a person's active role in a published community, if any. */
@Injectable()
export class GetCommunityRoleUseCase {
  constructor(@Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository) {}

  async execute(userId: string, communityId: string): Promise<CommunityMembershipRole | null> {
    const community = await this.repository.findPublishedBySlugOrId(communityId);
    if (!community) return null;
    const membership = await this.repository.findMembership(userId, community.id);
    return membership?.state === 'active' ? membership.role : null;
  }
}
