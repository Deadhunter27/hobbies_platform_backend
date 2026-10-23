/** Name of a person who may be shown publicly (active accounts only). */
export interface PersonName {
  id: string;
  displayName: string;
}

/**
 * Declared here, implemented by identity (owner of display names), so this
 * module never reads identity tables itself (ADR-0034).
 */
export interface PersonDirectory {
  findActive(ids: string[]): Promise<PersonName[]>;
  searchActive(query: string, limit: number): Promise<PersonName[]>;
}
export const PERSON_DIRECTORY = Symbol('PERSON_DIRECTORY');

export interface FollowEdge {
  userId: string;
  createdAt: Date;
}

export interface FollowRepository {
  follow(followerId: string, followeeId: string): Promise<void>;
  unfollow(followerId: string, followeeId: string): Promise<void>;
  counts(userId: string): Promise<{ followers: number; following: number }>;
  /** Of `candidateIds`, those that `followerId` follows. */
  followedAmong(followerId: string, candidateIds: string[]): Promise<Set<string>>;
  followeeIds(followerId: string): Promise<string[]>;
  list(
    userId: string,
    direction: 'followers' | 'following',
    limit: number,
    cursor: { createdAt: Date; id: string } | null,
  ): Promise<FollowEdge[]>;
}
export const FOLLOW_REPOSITORY = Symbol('FOLLOW_REPOSITORY');
