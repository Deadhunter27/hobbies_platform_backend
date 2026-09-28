import type { Actor } from '@modules/access/domain';
import type { TxContext } from '@shared/application';
import { CurateActivityUseCase, CurateCommunityUseCase } from './curate-supply.use-cases';

const actor: Actor = {
  id: '01K6B000000000000000000001',
  email: 'staff@example.com',
  displayName: 'Staff',
  status: 'active',
  globalRole: 'staff',
  sessionId: '01K6B000000000000000000002',
};

function dependencies(result: unknown) {
  const tx = {} as TxContext;
  return {
    tx,
    authorization: { assertCanManagePlatform: jest.fn().mockResolvedValue(undefined) },
    source: { execute: jest.fn().mockResolvedValue(result) },
    uow: { run: jest.fn(async (fn: (value: TxContext) => Promise<unknown>) => fn(tx)) },
    audit: { write: jest.fn().mockResolvedValue(undefined) },
  };
}

describe('W10 supply curation', () => {
  it('curates Activity through its source seam and audits atomically', async () => {
    const now = new Date('2026-09-28T10:00:00.000Z');
    const activity = {
      id: '01K6B000000000000000000003',
      status: 'cancelled',
      updatedAt: now,
    };
    const deps = dependencies(activity);
    const useCase = new CurateActivityUseCase(
      deps.authorization as never,
      deps.source as never,
      deps.uow as never,
      deps.audit as never,
    );

    await expect(useCase.execute(actor, activity.id, 'cancelled', now)).resolves.toBe(activity);
    expect(deps.source.execute).toHaveBeenCalledWith(activity.id, 'cancelled', now, deps.tx);
    expect(deps.audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        action: 'activity.cancel',
        resourceType: 'activity',
        resourceId: activity.id,
      }),
      deps.tx,
    );
  });

  it('curates Community through its source seam and audits atomically', async () => {
    const now = new Date('2026-09-28T10:00:00.000Z');
    const community = {
      id: '01K6B000000000000000000004',
      status: 'archived',
      updatedAt: now,
    };
    const deps = dependencies(community);
    const useCase = new CurateCommunityUseCase(
      deps.authorization as never,
      deps.source as never,
      deps.uow as never,
      deps.audit as never,
    );

    await expect(useCase.execute(actor, community.id, 'archived', now)).resolves.toBe(community);
    expect(deps.source.execute).toHaveBeenCalledWith(community.id, 'archived', now, deps.tx);
    expect(deps.audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        action: 'community.archive',
        resourceType: 'community',
        resourceId: community.id,
      }),
      deps.tx,
    );
  });
});
