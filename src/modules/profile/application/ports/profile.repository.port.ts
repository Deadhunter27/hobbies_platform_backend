import type { HobbyContext, ProfileContext } from '../../domain';

export interface ProfileRepository {
  findProfile(userId: string): Promise<ProfileContext | null>;
  upsertProfile(context: ProfileContext): Promise<ProfileContext>;
  listHobbyContexts(userId: string): Promise<HobbyContext[]>;
  findHobbyContext(userId: string, hobbyId: string): Promise<HobbyContext | null>;
  upsertHobbyContext(context: HobbyContext): Promise<HobbyContext>;
}

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');
