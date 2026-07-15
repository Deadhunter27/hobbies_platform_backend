import { PolicyService } from './policy.service';
import type { GrantsRepository } from './ports/grants.repository.port';
import { PLATFORM_RESOURCE, type Actor } from '../domain';

class InMemoryGrantsRepository implements GrantsRepository {
  queries: Array<[string, string, string]> = [];
  private rows = new Map<string, string>();

  grant(userId: string, resourceType: string, resourceId: string, role: string): void {
    this.rows.set(`${userId}|${resourceType}|${resourceId}`, role);
  }

  async findRole(userId: string, resourceType: string, resourceId: string): Promise<string | null> {
    this.queries.push([userId, resourceType, resourceId]);
    return this.rows.get(`${userId}|${resourceType}|${resourceId}`) ?? null;
  }
}

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    email: 'a@b.co',
    displayName: 'A',
    status: 'active',
    globalRole: 'user',
    sessionId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
    ...overrides,
  };
}

function setup() {
  const grants = new InMemoryGrantsRepository();
  return { grants, policy: new PolicyService(grants) };
}

describe('PolicyService.can (default deny, ADR-0018)', () => {
  it('DENIES an unknown action/resource combination with a reason', async () => {
    const { policy } = setup();
    const decision = await policy.can(actor(), 'made.up.action', { type: 'gadget', id: 'g1' });
    expect(decision).toEqual({ allow: false, reason: expect.stringContaining('no rule') });
  });

  it('denies any actor whose status is not active, before any rule runs', async () => {
    const { policy, grants } = setup();
    const suspended = actor({ status: 'suspended', globalRole: 'staff' });
    const decision = await policy.can(suspended, 'platform.manage', PLATFORM_RESOURCE);
    expect(decision.allow).toBe(false);
    expect(grants.queries).toHaveLength(0);
  });

  it('self rule: allows password change on OWN user resource only', async () => {
    const { policy } = setup();
    const me = actor();

    const own = await policy.can(me, 'identity.user.change_password', {
      type: 'user',
      id: me.id,
    });
    const other = await policy.can(me, 'identity.user.change_password', {
      type: 'user',
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
    });

    expect(own).toEqual({ allow: true });
    expect(other.allow).toBe(false);
  });

  it('global role: staff satisfies platform-scoped staff actions without a grant row', async () => {
    const { policy, grants } = setup();

    const decision = await policy.can(
      actor({ globalRole: 'staff' }),
      'platform.manage',
      PLATFORM_RESOURCE,
    );

    expect(decision).toEqual({ allow: true });
    expect(grants.queries).toHaveLength(0);
  });

  it('plain user is denied staff platform actions', async () => {
    const { policy } = setup();
    const decision = await policy.can(actor(), 'platform.manage', PLATFORM_RESOURCE);
    expect(decision.allow).toBe(false);
  });

  it('grants table: an explicit platform-scope grant satisfies the action', async () => {
    const { policy, grants } = setup();
    const me = actor();
    grants.grant(me.id, 'platform', 'platform', 'staff');

    const decision = await policy.can(me, 'catalog.manage', {
      type: 'platform',
      id: 'platform',
    });

    expect(decision).toEqual({ allow: true });
  });

  it('accepts resource-scoped queries today (M4 shape) and default-denies them', async () => {
    const { policy, grants } = setup();
    const me = actor();
    grants.grant(me.id, 'community', 'C1', 'organizer');

    // The engine consults the grant for the scoped resource but no rule
    // exists yet for community actions — deny, not crash (ADR-0018).
    const decision = await policy.can(me, 'community.manage', { type: 'community', id: 'C1' });

    expect(decision.allow).toBe(false);
    expect(grants.queries).toContainEqual([me.id, 'community', 'C1']);
  });
});
