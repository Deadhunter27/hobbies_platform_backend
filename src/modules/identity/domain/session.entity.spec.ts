import { Session } from './session.entity';

const FUTURE = new Date(Date.now() + 86_400_000);

describe('Session', () => {
  it('a brand-new session starts its own family (familyId === id)', () => {
    const session = Session.create({
      userId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      refreshTokenHash: 'a'.repeat(64),
      expiresAt: FUTURE,
    });

    expect(session.familyId).toBe(session.id);
    expect(session.isRotatedOrRevoked).toBe(false);
  });

  it('a rotated successor stays in the parent family', () => {
    const first = Session.create({
      userId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      refreshTokenHash: 'a'.repeat(64),
      expiresAt: FUTURE,
    });
    const next = Session.create({
      userId: first.userId,
      refreshTokenHash: 'b'.repeat(64),
      expiresAt: FUTURE,
      familyId: first.familyId,
    });

    expect(next.familyId).toBe(first.familyId);
    expect(next.id).not.toBe(first.id);
  });

  it('flags rotation/revocation and expiry correctly', () => {
    const base = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      userId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      refreshTokenHash: 'c'.repeat(64),
      familyId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      deviceLabel: null,
      expiresAt: FUTURE,
      revokedAt: null,
      replacedById: null,
      createdAt: new Date(),
    };

    expect(Session.reconstitute(base).isRotatedOrRevoked).toBe(false);
    expect(Session.reconstitute({ ...base, revokedAt: new Date() }).isRotatedOrRevoked).toBe(true);
    expect(
      Session.reconstitute({ ...base, replacedById: '01ARZ3NDEKTSV4RRFFQ69G5FAX' })
        .isRotatedOrRevoked,
    ).toBe(true);
    expect(Session.reconstitute({ ...base, expiresAt: new Date(0) }).isExpiredAt(new Date())).toBe(
      true,
    );
  });
});
