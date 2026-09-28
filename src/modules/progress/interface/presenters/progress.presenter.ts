import type { JourneyMoment } from '../../application';
import type { ProgressReflection } from '../../domain';
import type { JourneyMomentResponseDto, ProgressReflectionResponseDto } from '../dto/progress.dto';

export function toProgressReflectionResponse(
  reflection: ProgressReflection,
): ProgressReflectionResponseDto {
  return {
    id: reflection.id,
    hobbyId: reflection.hobbyId,
    activityId: reflection.activityId,
    rating: reflection.rating,
    tags: reflection.tags,
    note: reflection.note,
    occurredAt: reflection.occurredAt.toISOString(),
    createdAt: reflection.createdAt.toISOString(),
    updatedAt: reflection.updatedAt.toISOString(),
  };
}

export function toJourneyMomentResponse(moment: JourneyMoment): JourneyMomentResponseDto {
  return {
    ...toProgressReflectionResponse(moment.reflection),
    activityTitle: moment.activityTitle,
    activityType: moment.activityType,
    placeName: moment.placeName,
    hostName: moment.hostName,
  };
}
