import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TxContext, UnitOfWork } from '@shared/application';
import { PrismaService } from './prisma.service';

/**
 * ADR-0019: the opaque TxContext is a Prisma interactive-transaction client
 * under the hood. Only files in infrastructure/ may unwrap it.
 */
@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx as unknown as TxContext));
  }
}

/** Unwraps a TxContext back into a Prisma client, falling back to the
 * non-transactional service. Infrastructure-only helper. */
export function prismaClientOf(
  prisma: PrismaService,
  tx?: TxContext,
): Prisma.TransactionClient | PrismaService {
  return tx ? (tx as unknown as Prisma.TransactionClient) : prisma;
}
