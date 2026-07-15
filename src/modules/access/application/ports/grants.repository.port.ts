export interface GrantsRepository {
  /** Role held by the user on this exact resource, or null. Unique on
   * (userId, resourceType, resourceId) — one role per user per resource. */
  findRole(userId: string, resourceType: string, resourceId: string): Promise<string | null>;
}

export const GRANTS_REPOSITORY = Symbol('GRANTS_REPOSITORY');
