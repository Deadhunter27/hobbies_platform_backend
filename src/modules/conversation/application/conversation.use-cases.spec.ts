import { encodeCursor } from '@shared/utils';
import { ListHobbyFeedUseCase } from './conversation.use-cases';

const HOBBY_ID = '01K6B000000000000000000001';
const CONVERSATION_ID = '01K6B000000000000000000002';
const ACTIVITY_ID = '01K6B000000000000000000003';

function conversation(createdAt: Date) {
  return {
    id: CONVERSATION_ID,
    hobbyId: HOBBY_ID,
    communityReferenceId: null,
    activityReferenceId: null,
    authorId: '01K6B000000000000000000004',
    authorDisplayName: 'Runner A',
    title: 'How do you make an easy run actually easy?',
    body: 'I keep starting too quickly.',
    status: 'published' as const,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('ListHobbyFeedUseCase', () => {
  it('merges conversations and activities by contextual time while preserving source type/id', async () => {
    const now = new Date('2026-09-28T07:00:00.000Z');
    const conversationAt = new Date('2026-09-28T08:00:00.000Z');
    const activityAt = new Date('2026-09-29T07:00:00.000Z');
    const getHobby = { execute: jest.fn().mockResolvedValue({}) };
    const repository = {
      listPublished: jest.fn().mockResolvedValue({
        data: [conversation(conversationAt)],
        nextCursor: null,
      }),
    };
    const listActivities = {
      execute: jest.fn().mockResolvedValue([
        {
          activity: {
            id: ACTIVITY_ID,
            title: 'Easy social 5K',
            description: 'A relaxed upcoming run.',
            expectations: 'Conversational pace.',
            startsAt: activityAt,
            placeName: 'GBK',
            hostName: 'Jakarta Runners',
          },
        },
      ]),
    };

    const useCase = new ListHobbyFeedUseCase(
      getHobby as never,
      listActivities as never,
      repository as never,
    );

    const page = await useCase.execute({ hobbyId: HOBBY_ID, limit: 10, now });

    expect(page.data).toEqual([
      expect.objectContaining({ type: 'activity', sourceId: ACTIVITY_ID }),
      expect.objectContaining({ type: 'conversation', sourceId: CONVERSATION_ID }),
    ]);
    expect(page.nextCursor).toBeNull();
    expect(getHobby.execute).toHaveBeenCalledWith({ slugOrId: HOBBY_ID });
  });

  it('applies the feed cursor across both source types without engagement ranking', async () => {
    const now = new Date('2026-09-28T07:00:00.000Z');
    const conversationAt = new Date('2026-09-28T08:00:00.000Z');
    const activityAt = new Date('2026-09-29T07:00:00.000Z');
    const getHobby = { execute: jest.fn().mockResolvedValue({}) };
    const repository = {
      listPublished: jest.fn().mockResolvedValue({
        data: [conversation(conversationAt)],
        nextCursor: null,
      }),
    };
    const listActivities = {
      execute: jest.fn().mockResolvedValue([
        {
          activity: {
            id: ACTIVITY_ID,
            title: 'Easy social 5K',
            description: 'A relaxed upcoming run.',
            expectations: 'Conversational pace.',
            startsAt: activityAt,
            placeName: 'GBK',
            hostName: 'Jakarta Runners',
          },
        },
      ]),
    };
    const useCase = new ListHobbyFeedUseCase(
      getHobby as never,
      listActivities as never,
      repository as never,
    );
    const cursor = encodeCursor({ name: activityAt.toISOString(), id: ACTIVITY_ID });

    const page = await useCase.execute({ hobbyId: HOBBY_ID, limit: 10, cursor, now });

    expect(page.data).toEqual([
      expect.objectContaining({ type: 'conversation', sourceId: CONVERSATION_ID }),
    ]);
  });
});
