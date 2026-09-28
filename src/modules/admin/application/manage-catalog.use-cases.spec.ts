import type { Actor } from '@modules/access/domain';
import type { TxContext } from '@shared/application';
import { ManageCatalogUseCase } from './manage-catalog.use-cases';

const actor: Actor = {
  id: '01K6B000000000000000000001',
  email: 'staff@example.com',
  displayName: 'Staff',
  status: 'active',
  globalRole: 'staff',
  sessionId: '01K6B000000000000000000002',
};

function setup() {
  const tx = {} as TxContext;
  const authorization = { assertCanManageCatalog: jest.fn().mockResolvedValue(undefined) };
  const createCategory = { execute: jest.fn() };
  const updateCategory = { execute: jest.fn() };
  const createHobby = { execute: jest.fn() };
  const updateHobby = { execute: jest.fn() };
  const uow = { run: jest.fn(async (fn: (value: TxContext) => Promise<unknown>) => fn(tx)) };
  const audit = { write: jest.fn().mockResolvedValue(undefined) };
  const useCase = new ManageCatalogUseCase(
    authorization as never,
    createCategory as never,
    updateCategory as never,
    createHobby as never,
    updateHobby as never,
    uow as never,
    audit as never,
  );
  return {
    tx,
    authorization,
    createCategory,
    updateCategory,
    createHobby,
    updateHobby,
    uow,
    audit,
    useCase,
  };
}

describe('ManageCatalogUseCase', () => {
  it('creates a category through Catalog and audits in the same transaction', async () => {
    const deps = setup();
    const now = new Date('2026-09-28T11:00:00.000Z');
    const category = { id: '01K6B000000000000000000003', slug: 'outdoor' };
    deps.createCategory.execute.mockResolvedValue(category);
    const input = {
      parentId: null,
      name: 'Outdoor',
      slug: 'outdoor',
      description: null,
      sortOrder: 10,
    };

    await expect(deps.useCase.createHobbyCategory(actor, input, now)).resolves.toBe(category);
    expect(deps.authorization.assertCanManageCatalog).toHaveBeenCalledWith(actor);
    expect(deps.createCategory.execute).toHaveBeenCalledWith(input, now, deps.tx);
    expect(deps.audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        action: 'catalog.category.create',
        resourceType: 'hobby_category',
        resourceId: category.id,
      }),
      deps.tx,
    );
  });

  it('authorizes before starting any catalog mutation transaction', async () => {
    const deps = setup();
    const denied = new Error('denied');
    deps.authorization.assertCanManageCatalog.mockRejectedValue(denied);

    await expect(
      deps.useCase.createHobbyCategory(actor, {
        parentId: null,
        name: 'Outdoor',
        slug: 'outdoor',
        description: null,
        sortOrder: 10,
      }),
    ).rejects.toBe(denied);
    expect(deps.uow.run).not.toHaveBeenCalled();
    expect(deps.audit.write).not.toHaveBeenCalled();
  });
});
