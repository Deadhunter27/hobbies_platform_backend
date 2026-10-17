import type { HobbyContext, ProfileContext, ProfileDetails } from '../../domain';
import type {
  HobbyContextResponseDto,
  ProfileContextResponseDto,
  ProfileDetailsResponseDto,
} from '../dto/profile.dto';

export function toProfileContextResponse(
  context: ProfileContext | null,
): ProfileContextResponseDto {
  return context
    ? {
        city: context.city,
        countryCode: context.countryCode,
        timezone: context.timezone,
        updatedAt: context.updatedAt.toISOString(),
      }
    : { city: null, countryCode: null, timezone: null, updatedAt: null };
}

export function toHobbyContextResponse(context: HobbyContext): HobbyContextResponseDto {
  return {
    id: context.id,
    hobbyId: context.hobbyId,
    experienceLevel: context.experienceLevel,
    primaryIntent: context.primaryIntent,
    secondaryIntents: context.secondaryIntents,
    goal: context.goal,
    socialPreference: context.socialPreference,
    createdAt: context.createdAt.toISOString(),
    updatedAt: context.updatedAt.toISOString(),
  };
}

export function toProfileDetailsResponse(
  details: ProfileDetails,
  avatarUrl: string | null,
): ProfileDetailsResponseDto {
  return {
    handle: details.handle,
    birthYear: details.birthYear,
    gender: details.gender,
    instagramHandle: details.instagramHandle,
    tiktokHandle: details.tiktokHandle,
    acquisitionSource: details.acquisitionSource,
    acquisitionDetail: details.acquisitionDetail,
    avatarMediaId: details.avatarMediaId,
    avatarUrl,
    marketingConsent: details.marketingConsent,
    marketingConsentUpdatedAt: details.marketingConsentUpdatedAt?.toISOString() ?? null,
    introCompletedAt: details.introCompletedAt?.toISOString() ?? null,
  };
}
