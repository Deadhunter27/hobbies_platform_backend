import type { HobbyContext, ProfileContext, ProfileDetails } from '../../domain';

export interface ProfileRepository {
  findProfile(userId: string): Promise<ProfileContext | null>;
  upsertProfile(context: ProfileContext): Promise<ProfileContext>;
  listHobbyContexts(userId: string): Promise<HobbyContext[]>;
  findHobbyContext(userId: string, hobbyId: string): Promise<HobbyContext | null>;
  upsertHobbyContext(context: HobbyContext): Promise<HobbyContext>;
  findDetails(userId: string): Promise<ProfileDetails | null>;
  findDetailsMany(userIds: string[]): Promise<ProfileDetails[]>;
  /** Persists details; throws HandleTakenError when the handle is already used. */
  saveDetails(details: ProfileDetails): Promise<ProfileDetails>;
}

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');
