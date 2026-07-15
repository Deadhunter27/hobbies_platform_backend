import { Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { PrismaService, prismaClientOf } from '@infra/database';
import type { Session } from '../domain';
import type { SessionRepository } from '../application/ports/session.repository.port';
import { toDomainSession } from './mappers';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(session: Session, tx?: TxContext): Promise<void> {
    await prismaClientOf(this.prisma, tx).identitySession.create({
      data: {
        id: session.id,
        userId: session.userId,
        refreshTokenHash: session.refreshTokenHash,
        familyId: session.familyId,
        deviceLabel: session.deviceLabel,
        expiresAt: session.expiresAt,
      },
    });
  }

  async findByTokenHash(refreshTokenHash: string, tx?: TxContext): Promise<Session | null> {
    const record = await prismaClientOf(this.prisma, tx).identitySession.findUnique({
      where: { refreshTokenHash },
    });
    return record ? toDomainSession(record) : null;
  }

  async findById(id: string, tx?: TxContext): Promise<Session | null> {
    const record = await prismaClientOf(this.prisma, tx).identitySession.findUnique({
      where: { id },
    });
    return record ? toDomainSession(record) : null;
  }

  async markRotated(sessionId: string, replacedById: string, tx?: TxContext): Promise<void> {
    await prismaClientOf(this.prisma, tx).identitySession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), replacedById },
    });
  }

  async revoke(sessionId: string, tx?: TxContext): Promise<void> {
    await prismaClientOf(this.prisma, tx).identitySession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string, tx?: TxContext): Promise<void> {
    await prismaClientOf(this.prisma, tx).identitySession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string, tx?: TxContext): Promise<void> {
    await prismaClientOf(this.prisma, tx).identitySession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
