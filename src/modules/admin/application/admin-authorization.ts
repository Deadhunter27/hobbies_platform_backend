import { Injectable } from '@nestjs/common';
import { PLATFORM_RESOURCE, PolicyService, type Actor } from '@modules/access';
import { AdminAccessDeniedError } from '../domain';

@Injectable()
export class AdminAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanManagePlatform(actor: Actor): Promise<void> {
    const decision = await this.policy.can(actor, 'platform.manage', PLATFORM_RESOURCE);
    if (!decision.allow) throw new AdminAccessDeniedError();
  }
}
