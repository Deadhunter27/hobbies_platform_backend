import type { Actor } from '@modules/access';
import type { AuditRecord, TxContext } from '@shared/application';
import { ModerateConversationUseCase } from './moderate-conversation.use-case';

const actor: Actor = {
  id: '01K6B000000000000000000001',
  email: 'staff@example.com',
  displayName: 'Staff',
  status: 'active',
  globalRole: 'staff',
  sessionId: '01K6B000000000000000000002',
};

const conversation = {
  id: '01K6B000000000000000000003',
  hobbyId: '01K6B000000000000000000004',
  communityReferenceId: null,
  activityReferenceId: null,
  authorId: '01K6B000000000000000000005',
  authorDisplayName: 'Runner',
  title: 'Easy pace',
  body: 'How easy is easy?',
  status: 'archived' as const,
  createdAt: new Date('2026-09-28T08:00:00.000Z'),
  updatedAt: new Date('2026-09-28T09:00:00.000Z'),
};

describe('ModerateConversationUseCase', () => {
  it('authorizes first, mutates through the Conversation seam, and audits in the same transaction', async () => {
    const tx = {} as TxContext;
    const authorization = { assertCanManagePlatform: jest.fn().mockResolvedValue(undefined) };
    const setConversationStatus = { execute: jest.fn().mockResolvedValue(conversation) };
    const uow = { run: jest.fn(async (fn: (value: TxContext) => Promise<unknown>) => fn(tx)) };
    const records: AuditRecord[] = [];
    const audit = {
      write: jest.fn(async (record: AuditRecord) => {
        records.push(record);
      }),
    };
    const useCase = new ModerateConversationUseCase(
      authorization as never,
      setConversationStatus as never,
      uow as never,
      audit as never,
    );
    const now = new Date('2026-09-28T09:00:00.000Z');

    const result = await useCase.execute(actor, conversation.id, 'archived', now);

    expect(result).toBe(conversation);
    expect(authorization.assertCanManagePlatform).toHaveBeenCalledWith(actor);
    expect(setConversationStatus.execute).toHaveBeenCalledWith(
      conversation.id,
      'archived',
      now,
      tx,
    );
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        action: 'conversation.archive',
        resourceType: 'conversation',
        resourceId: conversation.id,
        metadata: { status: 'archived' },
      }),
      tx,
    );
    expect(records).toHaveLength(1);
  });

  it('does not start a mutation transaction when staff authorization fails', async () => {
    const denied = new Error('denied');
    const authorization = { assertCanManagePlatform: jest.fn().mockRejectedValue(denied) };
    const setConversationStatus = { execute: jest.fn() };
    const uow = { run: jest.fn() };
    const audit = { write: jest.fn() };
    const useCase = new ModerateConversationUseCase(
      authorization as never,
      setConversationStatus as never,
      uow as never,
      audit as never,
    );

    await expect(useCase.execute(actor, conversation.id, 'archived')).rejects.toBe(denied);
    expect(uow.run).not.toHaveBeenCalled();
    expect(setConversationStatus.execute).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });
});
