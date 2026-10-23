import type { HobbyContext, ProfileContext, ProfileDetails } from '../../domain';

export interface ProfileRepository {
  findProfile(userId: string): Promise<ProfileContext | null>;
  upsertProfile(context: ProfileContext): Promise<ProfileContext>;
  listHobbyContexts(userId: string): Promise<HobbyContext[]>;
  findHobbyContext(userId: string, hobbyId: string): Promise<HobbyContext | null>;
  upsertHobbyContext(context: HobbyContext): Promise<HobbyContext>;
  findDetails(userId: string): Promise<ProfileDetails | null>;
  findDetailsMany(userIds: string[]): Promise<ProfileDetails[]>;
  findDetailsByHandle(handle: string): Promise<ProfileDetails | null>;
  /** User ids whose handle starts with or contains the query (case-insensitive). */
  searchHandles(query: string, limit: number): Promise<string[]>;
  /** Users with a context for this hobby, most recently active first. */
  listUsersInHobby(hobbyId: string, limit: number, excludeUserIds: string[]): Promise<string[]>;
  /** Persists details; throws HandleTakenError when the handle is already used. */
  saveDetails(details: ProfileDetails): Promise<ProfileDetails>;
}

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');
