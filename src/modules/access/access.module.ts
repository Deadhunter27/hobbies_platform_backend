import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { PolicyService } from './application/policy.service';
import { GRANTS_REPOSITORY } from './application/ports/grants.repository.port';
import { PrismaGrantsRepository } from './infrastructure/prisma-grants.repository';
import { AuthGuard } from './interface/auth.guard';

/**
 * ADR-0018: access imports NO other bounded context. The TokenVerifier and
 * ActorDirectory ports it declares are implemented by identity and bound
 * in the composition root (AppModule registers AuthGuard as APP_GUARD).
 */
@Module({
  imports: [PrismaModule],
  providers: [
    PolicyService,
    AuthGuard,
    { provide: GRANTS_REPOSITORY, useClass: PrismaGrantsRepository },
  ],
  exports: [PolicyService, AuthGuard, GRANTS_REPOSITORY],
})
export class AccessModule {}
