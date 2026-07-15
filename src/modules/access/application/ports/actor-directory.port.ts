/**
 * Declared by access, implemented by identity (owner of identity_user),
 * bound at the composition root (ADR-0018).
 */
export interface ActorRecord {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended' | 'deleted';
  globalRole: 'user' | 'staff';
}

export interface ActorDirectory {
  findActor(userId: string): Promise<ActorRecord | null>;
}

export const ACTOR_DIRECTORY = Symbol('ACTOR_DIRECTORY');
