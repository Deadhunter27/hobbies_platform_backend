import type { Community, CommunityContext, CommunityMembership } from '../../domain';
import type {
  CommunityContextResponseDto,
  CommunityMembershipResponseDto,
  CommunityResponseDto,
} from '../dto/community.dto';

type CommunityPersonPreviewResponse = {
  personId: string;
  displayName: string;
  role: CommunityMembership['role'];
};

type CommunityContextWithPreviewResponse = Omit<CommunityContextResponseDto, 'people'> & {
  people: CommunityContextResponseDto['people'] & {
    membersPreview: CommunityPersonPreviewResponse[];
  };
};

export function toCommunityResponse(community: Community): CommunityResponseDto {
  return {
    id: community.id,
    hobbyId: community.hobbyId,
    name: community.name,
    slug: community.slug,
    description: community.description,
    city: community.city,
    countryCode: community.countryCode,
    status: community.status,
    createdAt: community.createdAt.toISOString(),
    updatedAt: community.updatedAt.toISOString(),
  };
}

export function toCommunityContextResponse(
  context: CommunityContext,
): CommunityContextWithPreviewResponse {
  return {
    ...toCommunityResponse(context.community),
    people: {
      memberCount: context.people.memberCount,
      hosts: context.people.hosts.map((membership) => ({
        personId: membership.userId,
        displayName: membership.displayNameSnapshot,
        role: membership.role,
      })),
      membersPreview: context.people.membersPreview.map((membership) => ({
        personId: membership.userId,
        displayName: membership.displayNameSnapshot,
        role: membership.role,
      })),
    },
  };
}

export function toCommunityMembershipResponse(
  membership: CommunityMembership,
): CommunityMembershipResponseDto {
  return {
    id: membership.id,
    communityId: membership.communityId,
    displayName: membership.displayNameSnapshot,
    role: membership.role,
    state: membership.state,
    joinedAt: membership.joinedAt.toISOString(),
    leftAt: membership.leftAt?.toISOString() ?? null,
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
  };
}
