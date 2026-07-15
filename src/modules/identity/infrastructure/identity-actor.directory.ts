import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database';
import type { ActorDirectory, ActorRecord } from '@modules/access';

/** identity implements the ActorDirectory port that access declares
 * (ADR-0018) — identity_user stays touchable only by its owning module. */
@Injectable()
export class IdentityActorDirectory implements ActorDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async findActor(userId: string): Promise<ActorRecord | null> {
    const record = await this.prisma.identityUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, status: true, globalRole: true },
    });
    return record;
  }
}
