import { Global, Module } from '@nestjs/common';
import { AUDIT_WRITER } from '@shared/application';
import { PrismaModule } from '@infra/database';
import { PrismaAuditWriter } from './prisma-audit-writer';

/** Cross-cutting facade (ADR-0019); global so every bounded context can
 * inject AUDIT_WRITER without importing infrastructure directly. */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [{ provide: AUDIT_WRITER, useClass: PrismaAuditWriter }],
  exports: [AUDIT_WRITER],
})
export class AuditModule {}
