import type { CheckIn, CheckInView } from '../../domain';
import type { CheckInResponseDto, CheckInStateResponseDto } from '../dto/checkin.dto';

export function toCheckInResponse(view: CheckInView): CheckInResponseDto {
  const { checkIn } = view;
  return {
    id: checkIn.id,
    activityId: checkIn.activityId,
    kind: checkIn.kind,
    status: checkIn.status,
    availableAt: checkIn.availableAt.toISOString(),
    actionedAt: checkIn.actionedAt?.toISOString() ?? null,
    dismissedAt: checkIn.dismissedAt?.toISOString() ?? null,
    createdAt: checkIn.createdAt.toISOString(),
    updatedAt: checkIn.updatedAt.toISOString(),
    title: view.title,
    body: view.body,
    ctaLabel: view.ctaLabel,
    activity: {
      title: view.activity.title,
      startsAt: view.activity.startsAt.toISOString(),
      placeName: view.activity.placeName,
    },
  };
}

export function toCheckInStateResponse(checkIn: CheckIn): CheckInStateResponseDto {
  return {
    id: checkIn.id,
    activityId: checkIn.activityId,
    kind: checkIn.kind,
    status: checkIn.status,
    availableAt: checkIn.availableAt.toISOString(),
    actionedAt: checkIn.actionedAt?.toISOString() ?? null,
    dismissedAt: checkIn.dismissedAt?.toISOString() ?? null,
    createdAt: checkIn.createdAt.toISOString(),
    updatedAt: checkIn.updatedAt.toISOString(),
  };
}
