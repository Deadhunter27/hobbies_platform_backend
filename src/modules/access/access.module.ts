import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { PolicyService } from './application/policy.service';
import { GRANTS_REPOSITORY } from './application/ports/grants.repository.port';
import { PrismaGrantsRepository } from './infrastructure/prisma-grants.repository';

/**
 * ADR-0018: access imports NO other bounded context. The TokenVerifier and
 * ActorDirectory ports it declares are implemented by identity and bound
 * in the composition root — which is also the ONLY place AuthGuard is
 * instantiated (as APP_GUARD): providing it here would make Nest resolve
 * its port dependencies inside this module's injector, where they
 * intentionally do not exist.
 */
@Module({
  imports: [PrismaModule],
  providers: [PolicyService, { provide: GRANTS_REPOSITORY, useClass: PrismaGrantsRepository }],
  exports: [PolicyService, GRANTS_REPOSITORY],
})
export class AccessModule {}
