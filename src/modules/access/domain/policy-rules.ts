import { allow, deny, type Actor, type PolicyDecision, type ResourceRef } from './policy.types';

/**
 * ADR-0018 rule set. Three rule families, evaluated in order; anything
 * that matches no rule DENIES. Adding a capability means adding an entry
 * here (reviewable), never scattering checks through use-cases.
 */

/** Rule 1 — self: actions an actor may always perform on their OWN user
 * resource. An allow-list, not "owner may do anything". */
const USER_SELF_ACTIONS: ReadonlySet<string> = new Set([
  'identity.user.read',
  'identity.user.change_password',
]);

/** Rule 2 — global role: platform-scoped actions satisfied by
 * identity_user.globalRole, evaluated live. */
const PLATFORM_ACTIONS_BY_ROLE: Readonly<Record<string, ReadonlySet<string>>> = {
  staff: new Set(['platform.manage', 'catalog.manage']),
};

/** Rule 3 — grants table: `${resourceType}:${action}` → roles that satisfy
 * it. M2 ships platform-scope entries only; M4 adds community rows here
 * without touching the engine. */
const GRANT_ROLE_REQUIREMENTS: Readonly<Record<string, ReadonlySet<string>>> = {
  'platform:catalog.manage': new Set(['staff']),
  'platform:platform.manage': new Set(['staff']),
};

export function selfRuleAllows(actor: Actor, action: string, resource: ResourceRef): boolean {
  return resource.type === 'user' && resource.id === actor.id && USER_SELF_ACTIONS.has(action);
}

export function globalRoleAllows(actor: Actor, action: string, resource: ResourceRef): boolean {
  if (resource.type !== 'platform') return false;
  return PLATFORM_ACTIONS_BY_ROLE[actor.globalRole]?.has(action) ?? false;
}

/** Decides using an already-fetched grant role (null = no grant row). */
export function grantRuleDecision(
  action: string,
  resource: ResourceRef,
  grantedRole: string | null,
): PolicyDecision {
  const required = GRANT_ROLE_REQUIREMENTS[`${resource.type}:${action}`];
  if (!required) {
    return deny(`no rule for action "${action}" on resource type "${resource.type}"`);
  }
  if (grantedRole !== null && required.has(grantedRole)) {
    return allow;
  }
  return deny(`role "${grantedRole ?? 'none'}" does not satisfy "${action}"`);
}
