import { Injectable } from '@nestjs/common';
import { PolicyService } from '@modules/access/application/policy.service';
import { PLATFORM_RESOURCE, type Actor } from '@modules/access/domain';
import { AdminAccessDeniedError } from '../domain';

@Injectable()
export class AdminAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanManagePlatform(actor: Actor): Promise<void> {
    const decision = await this.policy.can(actor, 'platform.manage', PLATFORM_RESOURCE);
    if (!decision.allow) throw new AdminAccessDeniedError();
  }

  async assertCanManageCatalog(actor: Actor): Promise<void> {
    const decision = await this.policy.can(actor, 'catalog.manage', PLATFORM_RESOURCE);
    if (!decision.allow) throw new AdminAccessDeniedError();
  }
}
