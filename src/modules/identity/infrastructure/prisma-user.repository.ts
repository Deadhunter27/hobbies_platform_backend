import { Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { PrismaService, prismaClientOf } from '@infra/database';
import type { User } from '../domain';
import type { UserRepository } from '../application/ports/user.repository.port';
import { toDomainUser } from './mappers';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string, tx?: TxContext): Promise<User | null> {
    const record = await prismaClientOf(this.prisma, tx).identityUser.findUnique({
      where: { email },
    });
    return record ? toDomainUser(record) : null;
  }

  async findById(id: string, tx?: TxContext): Promise<User | null> {
    const record = await prismaClientOf(this.prisma, tx).identityUser.findUnique({
      where: { id },
    });
    return record ? toDomainUser(record) : null;
  }

  async create(user: User, tx?: TxContext): Promise<void> {
    await prismaClientOf(this.prisma, tx).identityUser.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        status: user.status,
        globalRole: user.globalRole,
      },
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string, tx?: TxContext): Promise<void> {
    await prismaClientOf(this.prisma, tx).identityUser.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
