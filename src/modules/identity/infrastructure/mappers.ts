import type { IdentitySession, IdentityUser } from '@prisma/client';
import { Session, User } from '../domain';

export function toDomainUser(record: IdentityUser): User {
  return User.reconstitute({
    id: record.id,
    email: record.email,
    passwordHash: record.passwordHash,
    displayName: record.displayName,
    status: record.status,
    globalRole: record.globalRole,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainSession(record: IdentitySession): Session {
  return Session.reconstitute({
    id: record.id,
    userId: record.userId,
    refreshTokenHash: record.refreshTokenHash,
    familyId: record.familyId,
    deviceLabel: record.deviceLabel,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    replacedById: record.replacedById,
    createdAt: record.createdAt,
  });
}
