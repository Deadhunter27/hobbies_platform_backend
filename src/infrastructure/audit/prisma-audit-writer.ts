import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuditRecord, AuditWriter, TxContext } from '@shared/application';
import { PrismaService, prismaClientOf } from '@infra/database';
import { newId } from '@shared/utils';

/**
 * ADR-0019: append-only. This class exposes exactly one operation and no
 * update/delete exists anywhere in the codebase. Callers pass the ambient
 * TxContext so the audit row commits atomically with the action.
 */
@Injectable()
export class PrismaAuditWriter implements AuditWriter {
  constructor(private readonly prisma: PrismaService) {}

  async write(record: AuditRecord, tx?: TxContext): Promise<void> {
    await prismaClientOf(this.prisma, tx).auditEntry.create({
      data: {
        id: newId(),
        actorId: record.actorId,
        action: record.action,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        metadata: (record.metadata ?? {}) as Prisma.InputJsonValue,
        requestId: record.requestId ?? null,
      },
    });
  }
}
