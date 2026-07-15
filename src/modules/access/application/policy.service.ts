import { Inject, Injectable } from '@nestjs/common';
import {
  allow,
  deny,
  globalRoleAllows,
  grantRuleDecision,
  selfRuleAllows,
  type Actor,
  type PolicyDecision,
  type ResourceRef,
} from '../domain';
import { GRANTS_REPOSITORY, type GrantsRepository } from './ports/grants.repository.port';

/**
 * ADR-0018: the single authorization entry point. Default deny — an
 * unknown action/resource combination never allows. Accepts any
 * resource-scoped query today; only the rule tables grow over time.
 */
@Injectable()
export class PolicyService {
  constructor(@Inject(GRANTS_REPOSITORY) private readonly grants: GrantsRepository) {}

  async can(actor: Actor, action: string, resource: ResourceRef): Promise<PolicyDecision> {
    if (actor.status !== 'active') {
      return deny(`actor status is "${actor.status}"`);
    }

    if (selfRuleAllows(actor, action, resource)) {
      return allow;
    }

    if (globalRoleAllows(actor, action, resource)) {
      return allow;
    }

    const grantedRole = await this.grants.findRole(actor.id, resource.type, resource.id);
    return grantRuleDecision(action, resource, grantedRole);
  }
}
