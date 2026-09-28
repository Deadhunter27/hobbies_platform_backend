import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { GetHobbyUseCase } from '@modules/catalog';
import { GetMyHobbyContextUseCase } from '@modules/profile';
import { ListActivitiesUseCase } from '@modules/activity';
import { InvalidCursorError } from '@shared/errors';
import { decodeCursor, encodeCursor, newId } from '@shared/utils';
import {
  ConversationNotFoundError,
  type Conversation,
  type ConversationDetail,
  type ConversationPage,
  type ConversationReply,
  type HobbyFeedItem,
  type HobbyFeedPage,
} from '../domain';
import { ConversationAuthorization } from './authorization';
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from './ports/conversation.repository.port';

function pageCursor(raw?: string): { createdAt: Date; id: string } | null {
  if (!raw) return null;
  const decoded = decodeCursor(raw);
  const createdAt = new Date(decoded.name);
  if (Number.isNaN(createdAt.getTime())) throw new InvalidCursorError();
  return { createdAt, id: decoded.id };
}

function feedAfterCursor(
  item: HobbyFeedItem,
  cursor: { occurredAt: Date; id: string } | null,
): boolean {
  if (!cursor) return true;
  const itemTime = item.occurredAt.getTime();
  const cursorTime = cursor.occurredAt.getTime();
  return itemTime < cursorTime || (itemTime === cursorTime && item.sourceId < cursor.id);
}

@Injectable()
export class ListConversationsUseCase {
  constructor(
    private readonly getHobby: GetHobbyUseCase,
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(input: {
    hobbyId: string;
    limit: number;
    cursor?: string;
  }): Promise<ConversationPage> {
    await this.getHobby.execute({ slugOrId: input.hobbyId });
    return this.repository.listPublished({
      hobbyId: input.hobbyId,
      limit: input.limit,
      cursor: pageCursor(input.cursor),
    });
  }
}

@Injectable()
export class GetConversationUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(id: string): Promise<ConversationDetail> {
    const detail = await this.repository.findPublishedById(id);
    if (!detail) throw new ConversationNotFoundError(id);
    return detail;
  }
}

export interface CreateConversationInput {
  title: string;
  body: string;
  communityReferenceId: string | null;
  activityReferenceId: string | null;
}

@Injectable()
export class CreateConversationUseCase {
  constructor(
    private readonly authorization: ConversationAuthorization,
    private readonly getHobby: GetHobbyUseCase,
    private readonly getHobbyContext: GetMyHobbyContextUseCase,
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(
    actor: Actor,
    hobbyId: string,
    input: CreateConversationInput,
    now = new Date(),
  ): Promise<Conversation> {
    await this.authorization.assertCanWrite(actor);
    await this.getHobby.execute({ slugOrId: hobbyId });
    await this.getHobbyContext.execute(actor, hobbyId);

    return this.repository.createConversation({
      id: newId(),
      hobbyId,
      communityReferenceId: input.communityReferenceId,
      activityReferenceId: input.activityReferenceId,
      authorId: actor.id,
      authorDisplayName: actor.displayName,
      title: input.title.trim(),
      body: input.body.trim(),
      status: 'published',
      createdAt: now,
      updatedAt: now,
    });
  }
}

@Injectable()
export class ReplyToConversationUseCase {
  constructor(
    private readonly authorization: ConversationAuthorization,
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(
    actor: Actor,
    conversationId: string,
    body: string,
    now = new Date(),
  ): Promise<ConversationReply> {
    await this.authorization.assertCanWrite(actor);
    const conversation = await this.repository.findPublishedById(conversationId);
    if (!conversation) throw new ConversationNotFoundError(conversationId);

    return this.repository.createReply({
      id: newId(),
      conversationId,
      authorId: actor.id,
      authorDisplayName: actor.displayName,
      body: body.trim(),
      createdAt: now,
      updatedAt: now,
    });
  }
}

@Injectable()
export class ListHobbyFeedUseCase {
  constructor(
    private readonly getHobby: GetHobbyUseCase,
    private readonly listActivities: ListActivitiesUseCase,
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(input: {
    hobbyId: string;
    limit: number;
    cursor?: string;
    now?: Date;
  }): Promise<HobbyFeedPage> {
    await this.getHobby.execute({ slugOrId: input.hobbyId });
    const now = input.now ?? new Date();
    const rawCursor = input.cursor ? decodeCursor(input.cursor) : null;
    const cursor = rawCursor ? { occurredAt: new Date(rawCursor.name), id: rawCursor.id } : null;
    if (cursor && Number.isNaN(cursor.occurredAt.getTime())) throw new InvalidCursorError();

    const [conversationPage, activityViews] = await Promise.all([
      this.repository.listPublished({
        hobbyId: input.hobbyId,
        limit: Math.min(input.limit * 2 + 1, 101),
        cursor: null,
      }),
      this.listActivities.execute({ hobbyId: input.hobbyId }, now),
    ]);

    const items: HobbyFeedItem[] = [
      ...conversationPage.data.map((conversation) => ({
        type: 'conversation' as const,
        sourceId: conversation.id,
        occurredAt: conversation.createdAt,
        title: conversation.title,
        summary: conversation.body,
        authorDisplayName: conversation.authorDisplayName,
      })),
      ...activityViews.map((view) => ({
        type: 'activity' as const,
        sourceId: view.activity.id,
        occurredAt: view.activity.startsAt,
        title: view.activity.title,
        summary: view.activity.description ?? view.activity.expectations,
        placeName: view.activity.placeName,
        hostName: view.activity.hostName,
      })),
    ]
      .filter((item) => feedAfterCursor(item, cursor))
      .sort((a, b) => {
        const time = b.occurredAt.getTime() - a.occurredAt.getTime();
        return time !== 0 ? time : b.sourceId.localeCompare(a.sourceId);
      });

    const data = items.slice(0, input.limit);
    const hasMore = items.length > input.limit;
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        hasMore && last
          ? encodeCursor({ name: last.occurredAt.toISOString(), id: last.sourceId })
          : null,
    };
  }
}
