import { Injectable } from '@nestjs/common';
import { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import { MediaService, type ViewableMedia } from '@modules/media';
import { PublicProfileService, type PublicPersonSummary } from '@modules/profile';
import { PlatformSettingsService } from '@modules/settings';
import { visibleMediaCount, type PostRecord, type ReplyRecord } from '../domain';

export interface PersonView {
  id: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
}

/** A locked item is a photo the signed-out viewer may not open yet. */
export interface MediaView {
  id: string;
  mimeType: string | null;
  url: string | null;
  locked: boolean;
}

export interface HobbyRefView {
  id: string;
  name: string;
  slug: string;
}

export interface PostView {
  id: string;
  hobby: HobbyRefView | null;
  author: PersonView;
  title: string | null;
  body: string;
  media: MediaView[];
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
  isMine: boolean;
  communityReferenceId: string | null;
  activityReferenceId: string | null;
  createdAt: Date;
}

export interface ReplyView {
  id: string;
  postId: string;
  parentReplyId: string | null;
  author: PersonView;
  body: string;
  media: MediaView[];
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
  createdAt: Date;
}

interface Lookups {
  people: Map<string, PublicPersonSummary>;
  media: Map<string, ViewableMedia>;
  ratio: number;
}

/** Turns stored posts/replies into what a given viewer is allowed to see. */
@Injectable()
export class PostViewAssembler {
  constructor(
    private readonly profiles: PublicProfileService,
    private readonly mediaService: MediaService,
    private readonly settings: PlatformSettingsService,
    private readonly getHobby: GetHobbyUseCase,
  ) {}

  async posts(records: PostRecord[], viewerId: string | null): Promise<PostView[]> {
    const lookups = await this.lookups(records, viewerId);
    const hobbies = await this.hobbies(records.map((record) => record.hobbyId));
    return records.map((record) => ({
      id: record.id,
      hobby: hobbies.get(record.hobbyId) ?? null,
      author: this.person(record.authorId, record.authorDisplayName, lookups),
      title: record.title,
      body: record.body,
      media: this.media(record.mediaIds, viewerId, lookups),
      likeCount: record.likeCount,
      replyCount: record.replyCount,
      likedByMe: record.likedByViewer,
      isMine: viewerId === record.authorId,
      communityReferenceId: record.communityReferenceId,
      activityReferenceId: record.activityReferenceId,
      createdAt: record.createdAt,
    }));
  }

  async replies(records: ReplyRecord[], viewerId: string | null): Promise<ReplyView[]> {
    const lookups = await this.lookups(records, viewerId);
    return records.map((record) => ({
      id: record.id,
      postId: record.postId,
      parentReplyId: record.parentReplyId,
      author: this.person(record.authorId, record.authorDisplayName, lookups),
      body: record.body,
      media: this.media(record.mediaIds, viewerId, lookups),
      likeCount: record.likeCount,
      likedByMe: record.likedByViewer,
      isMine: viewerId === record.authorId,
      createdAt: record.createdAt,
    }));
  }

  private async lookups(
    records: Array<{ authorId: string; mediaIds: string[] }>,
    viewerId: string | null,
  ): Promise<Lookups> {
    const [people, media, ratio] = await Promise.all([
      this.profiles.summaries(records.map((record) => record.authorId)),
      this.mediaService.viewable(records.flatMap((record) => record.mediaIds)),
      viewerId ? Promise.resolve(1) : this.settings.get('media.signedOutVisibleRatio'),
    ]);
    return { people, media, ratio };
  }

  private person(id: string, displayName: string, lookups: Lookups): PersonView {
    const summary = lookups.people.get(id);
    return {
      id,
      displayName,
      handle: summary?.handle ?? null,
      avatarUrl: summary?.avatarUrl ?? null,
    };
  }

  private media(ids: string[], viewerId: string | null, lookups: Lookups): MediaView[] {
    // Removed or hidden photos disappear entirely; they are never "locked".
    const available = ids.map((id) => lookups.media.get(id)).filter((m): m is ViewableMedia => !!m);
    const open = visibleMediaCount(available.length, viewerId !== null, lookups.ratio);
    return available.map((item, index) =>
      index < open
        ? { id: item.id, mimeType: item.mimeType, url: item.url, locked: false }
        : { id: item.id, mimeType: null, url: null, locked: true },
    );
  }

  private async hobbies(ids: string[]): Promise<Map<string, HobbyRefView>> {
    const result = new Map<string, HobbyRefView>();
    await Promise.all(
      [...new Set(ids)].map(async (id) => {
        try {
          const hobby = await this.getHobby.execute({ slugOrId: id });
          result.set(id, { id: hobby.id, name: hobby.name, slug: hobby.slug });
        } catch {
          // A retired hobby must not break the feed; the post simply shows no hobby chip.
        }
      }),
    );
    return result;
  }
}
