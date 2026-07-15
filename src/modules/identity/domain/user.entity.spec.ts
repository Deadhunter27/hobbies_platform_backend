import { User } from './user.entity';

describe('User', () => {
  it('create() normalizes email, defaults to active/user, and assigns a ULID', () => {
    const user = User.create({
      email: '  Alice@Example.COM ',
      passwordHash: '$argon2id$fake',
      displayName: 'Alice',
    });

    expect(user.email).toBe('alice@example.com');
    expect(user.status).toBe('active');
    expect(user.globalRole).toBe('user');
    expect(user.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(user.isActive).toBe(true);
  });

  it('reconstitute() preserves persisted state verbatim', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const user = User.reconstitute({
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      email: 'bob@example.com',
      passwordHash: 'hash',
      displayName: 'Bob',
      status: 'suspended',
      globalRole: 'staff',
      createdAt: now,
      updatedAt: now,
    });

    expect(user.status).toBe('suspended');
    expect(user.globalRole).toBe('staff');
    expect(user.isActive).toBe(false);
  });
});
