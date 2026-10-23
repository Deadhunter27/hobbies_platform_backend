import { Inject, Injectable } from '@nestjs/common';
import { PolicyService, type Actor } from '@modules/access';
import { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import { PublicProfileService } from '@modules/profile';
import { ForbiddenError, InvalidCursorError } from '@shared/errors';
import { decodeCursor, encodeCursor } from '@shared/utils';
import { CannotFollowSelfError, PersonNotFoundError, ULID_PATTERN } from '../domain';
import {
  FOLLOW_REPOSITORY,
  PERSON_DIRECTORY,
  type FollowRepository,
  type PersonDirectory,
} from './ports/people.ports';

export interface PersonCard {
  id: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  isFollowing: boolean;
  isMe: boolean;
}

export interface PersonProfile extends PersonCard {
  instagramHandle: string | null;
  tiktokHandle: string | null;
  hobbies: Array<{ id: string; name: string; slug: string }>;
  followerCount: number;
  followingCount: number;
  followsYou: boolean;
}

/** Builds person cards for a viewer: names, handles, avatars, follow state. */
@Injectable()
export class PersonCards {
  constructor(
    @Inject(PERSON_DIRECTORY) private readonly directory: PersonDirectory,
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository,
    private readonly profiles: PublicProfileService,
  ) {}

  async build(userIds: string[], viewerId: string | null): Promise<PersonCard[]> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return [];
    const [names, summaries, followed] = await Promise.all([
      this.directory.findActive(unique),
      this.profiles.summaries(unique),
      viewerId ? this.follows.followedAmong(viewerId, unique) : Promise.resolve(new Set<string>()),
    ]);
    const byId = new Map(names.map((name) => [name.id, name]));
    // Keep the caller's order; suspended or deleted accounts drop out.
    return unique.flatMap((id) => {
      const name = byId.get(id);
      if (!name) return [];
      const summary = summaries.get(id);
      return [
        {
          id,
          displayName: name.displayName,
          handle: summary?.handle ?? null,
          avatarUrl: summary?.avatarUrl ?? null,
          isFollowing: followed.has(id),
          isMe: viewerId === id,
        },
      ];
    });
  }
}

@Injectable()
export class GetPersonUseCase {
  constructor(
    private readonly cards: PersonCards,
    private readonly profiles: PublicProfileService,
    private readonly getHobby: GetHobbyUseCase,
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository,
  ) {}

  /** `ref` is a person id or an @handle. */
  async execute(viewer: Actor | null, ref: string): Promise<PersonProfile> {
    const userId = ULID_PATTERN.test(ref) ? ref : await this.profiles.userIdForHandle(ref);
    if (!userId) throw new PersonNotFoundError(ref);
    const [card] = await this.cards.build([userId], viewer?.id ?? null);
    if (!card) throw new PersonNotFoundError(ref);

    const [details, counts, followsYou] = await Promise.all([
      this.profiles.details(userId),
      this.follows.counts(userId),
      viewer && viewer.id !== userId
        ? this.follows.followedAmong(userId, [viewer.id]).then((set) => set.has(viewer.id))
        : Promise.resolve(false),
    ]);
    const hobbies = (
      await Promise.all(
        details.hobbyIds.map((id) =>
          this.getHobby
            .execute({ slugOrId: id })
            .then((hobby) => ({ id: hobby.id, name: hobby.name, slug: hobby.slug }))
            .catch(() => null),
        ),
      )
    ).filter((hobby): hobby is { id: string; name: string; slug: string } => hobby !== null);

    return {
      ...card,
      instagramHandle: details.instagramHandle,
      tiktokHandle: details.tiktokHandle,
      hobbies,
      followerCount: counts.followers,
      followingCount: counts.following,
      followsYou,
    };
  }
}

@Injectable()
export class SearchPeopleUseCase {
  constructor(
    private readonly cards: PersonCards,
    private readonly profiles: PublicProfileService,
    @Inject(PERSON_DIRECTORY) private readonly directory: PersonDirectory,
  ) {}

  async execute(viewer: Actor | null, query: string, limit: number): Promise<PersonCard[]> {
    const q = query.trim();
    const [byHandle, byName] = await Promise.all([
      this.profiles.searchHandles(q, limit),
      this.directory.searchActive(q.replace(/^@/, ''), limit),
    ]);
    // Exact handle matches first, then name matches.
    const ids = [...byHandle, ...byName.map((person) => person.id)].slice(0, limit * 2);
    return (await this.cards.build(ids, viewer?.id ?? null)).slice(0, limit);
  }
}

@Injectable()
export class SuggestPeopleUseCase {
  constructor(
    private readonly cards: PersonCards,
    private readonly profiles: PublicProfileService,
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository,
  ) {}

  /** People in the same hobby you don't follow yet. No popularity ranking. */
  async execute(viewer: Actor, hobbyId: string, limit: number): Promise<PersonCard[]> {
    const following = await this.follows.followeeIds(viewer.id);
    const ids = await this.profiles.usersInHobby(hobbyId, limit, [viewer.id, ...following]);
    return this.cards.build(ids, viewer.id);
  }
}

@Injectable()
export class FollowUseCase {
  constructor(
    private readonly policy: PolicyService,
    @Inject(PERSON_DIRECTORY) private readonly directory: PersonDirectory,
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository,
  ) {}

  async execute(actor: Actor, targetId: string, follow: boolean): Promise<void> {
    const decision = await this.policy.can(actor, 'people.self.write', {
      type: 'user',
      id: actor.id,
    });
    if (!decision.allow)
      throw new ForbiddenError('Follow denied.', undefined, 'PEOPLE_ACCESS_DENIED');
    if (targetId === actor.id) throw new CannotFollowSelfError();
    if (!follow) {
      await this.follows.unfollow(actor.id, targetId);
      return;
    }
    const [target] = await this.directory.findActive([targetId]);
    if (!target) throw new PersonNotFoundError(targetId);
    await this.follows.follow(actor.id, targetId);
  }
}

@Injectable()
export class ListFollowsUseCase {
  constructor(
    private readonly cards: PersonCards,
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository,
  ) {}

  async execute(
    viewer: Actor | null,
    userId: string,
    direction: 'followers' | 'following',
    limit: number,
    rawCursor?: string,
  ): Promise<{ data: PersonCard[]; nextCursor: string | null }> {
    let cursor: { createdAt: Date; id: string } | null = null;
    if (rawCursor) {
      const decoded = decodeCursor(rawCursor);
      const createdAt = new Date(decoded.name);
      if (Number.isNaN(createdAt.getTime())) throw new InvalidCursorError();
      cursor = { createdAt, id: decoded.id };
    }
    const edges = await this.follows.list(userId, direction, limit + 1, cursor);
    const page = edges.slice(0, limit);
    const last = page.at(-1);
    return {
      data: await this.cards.build(
        page.map((edge) => edge.userId),
        viewer?.id ?? null,
      ),
      nextCursor:
        edges.length > limit && last
          ? encodeCursor({ name: last.createdAt.toISOString(), id: last.userId })
          : null,
    };
  }
}

/** Public seam for other modules (the "Following" feed). */
@Injectable()
export class FollowGraph {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository) {}

  followeeIds(userId: string): Promise<string[]> {
    return this.follows.followeeIds(userId);
  }
}
