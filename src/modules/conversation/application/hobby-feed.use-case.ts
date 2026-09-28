import { Inject, Injectable } from '@nestjs/common';
import { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import { ListActivitiesUseCase } from '@modules/activity/application/activity.use-cases';
import { InvalidCursorError } from '@shared/errors';
import { decodeCursor, encodeCursor } from '@shared/utils';
import type { HobbyFeedItem, HobbyFeedPage } from '../domain';
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from './ports/conversation.repository.port';

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
