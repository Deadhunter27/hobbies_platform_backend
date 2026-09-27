import type { ActivityView } from '../../application';
import type { ActivityCommitment } from '../../domain';
import type {
  ActivityCommitmentResponseDto,
  ActivityResponseDto,
} from '../dto/activity.dto';

export function toActivityResponse(view: ActivityView): ActivityResponseDto {
  const activity = view.activity;
  return {
    id: activity.id,
    hobbyId: activity.hobbyId,
    title: activity.title,
    description: activity.description,
    activityType: activity.activityType,
    startsAt: activity.startsAt.toISOString(),
    endsAt: activity.endsAt?.toISOString() ?? null,
    timezone: activity.timezone,
    placeName: activity.placeName,
    addressLabel: activity.addressLabel,
    latitude: activity.latitude,
    longitude: activity.longitude,
    hostName: activity.hostName,
    hostType: activity.hostType,
    hostReferenceId: activity.hostReferenceId,
    communityReferenceId: activity.communityReferenceId,
    effortLevel: activity.effortLevel,
    capacity: activity.capacity,
    status: activity.status,
    preparation: activity.preparation,
    expectations: activity.expectations,
    committedCount: view.committedCount,
    spotsRemaining: view.spotsRemaining,
    availability: view.availability,
  };
}

export function toActivityCommitmentResponse(
  commitment: ActivityCommitment,
): ActivityCommitmentResponseDto {
  return {
    id: commitment.id,
    activityId: commitment.activityId,
    state: commitment.state,
    committedAt: commitment.committedAt?.toISOString() ?? null,
    cancelledAt: commitment.cancelledAt?.toISOString() ?? null,
    missedAt: commitment.missedAt?.toISOString() ?? null,
    note: commitment.note,
    createdAt: commitment.createdAt.toISOString(),
    updatedAt: commitment.updatedAt.toISOString(),
  };
}
