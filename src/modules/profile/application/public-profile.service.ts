import { Inject, Injectable } from '@nestjs/common';
import { MediaService } from '@modules/media';
import { PROFILE_REPOSITORY, type ProfileRepository } from './ports/profile.repository.port';

/** What other people may see about someone next to their content (ADR-0031 §4). */
export interface PublicPersonSummary {
  userId: string;
  handle: string | null;
  avatarUrl: string | null;
}

/** The public part of a profile page (ADR-0034): never birth year, gender or consent. */
export interface PublicProfileDetails {
  userId: string;
  handle: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  hobbyIds: string[];
}

/**
 * Public, read-only view of people for other modules (feeds, replies,
 * communities). Only the handle and avatar leave the profile module; birth
 * year, gender, socials and consent stay private.
 */
@Injectable()
export class PublicProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
    private readonly media: MediaService,
  ) {}

  async summaries(userIds: string[]): Promise<Map<string, PublicPersonSummary>> {
    const unique = [...new Set(userIds)];
    const details = await this.repository.findDetailsMany(unique);
    const avatars = await this.media.viewable(
      details.map((item) => item.avatarMediaId).filter((id): id is string => Boolean(id)),
    );
    const byUser = new Map(details.map((item) => [item.userId, item]));
    return new Map(
      unique.map((userId) => {
        const item = byUser.get(userId);
        const avatarId = item?.avatarMediaId ?? null;
        return [
          userId,
          {
            userId,
            handle: item?.handle ?? null,
            avatarUrl: avatarId ? (avatars.get(avatarId)?.url ?? null) : null,
          },
        ];
      }),
    );
  }

  async details(userId: string): Promise<PublicProfileDetails> {
    const [details, contexts] = await Promise.all([
      this.repository.findDetails(userId),
      this.repository.listHobbyContexts(userId),
    ]);
    return {
      userId,
      handle: details?.handle ?? null,
      avatarUrl: await this.media.signedUrl(details?.avatarMediaId ?? null),
      instagramHandle: details?.instagramHandle ?? null,
      tiktokHandle: details?.tiktokHandle ?? null,
      hobbyIds: contexts.map((context) => context.hobbyId),
    };
  }

  async userIdForHandle(handle: string): Promise<string | null> {
    const details = await this.repository.findDetailsByHandle(handle.replace(/^@/, ''));
    return details?.userId ?? null;
  }

  searchHandles(query: string, limit: number): Promise<string[]> {
    return this.repository.searchHandles(query.replace(/^@/, ''), limit);
  }

  usersInHobby(hobbyId: string, limit: number, excludeUserIds: string[]): Promise<string[]> {
    return this.repository.listUsersInHobby(hobbyId, limit, excludeUserIds);
  }
}
