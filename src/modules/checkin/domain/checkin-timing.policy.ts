import type { CheckInKind } from './checkin.types';

const HOUR_MS = 60 * 60 * 1000;
const REMINDER_LEAD_MS = 24 * HOUR_MS;
const MISSED_GRACE_MS = 6 * HOUR_MS;

export function resolveCheckInTiming(
  startsAt: Date,
  now: Date,
): { kind: CheckInKind; availableAt: Date } | null {
  const diff = startsAt.getTime() - now.getTime();
  if (diff > 0 && diff <= REMINDER_LEAD_MS) {
    return {
      kind: 'activity_reminder',
      availableAt: new Date(startsAt.getTime() - REMINDER_LEAD_MS),
    };
  }

  const elapsed = now.getTime() - startsAt.getTime();
  if (elapsed >= 0 && elapsed < MISSED_GRACE_MS) {
    return { kind: 'post_activity', availableAt: startsAt };
  }
  if (elapsed >= MISSED_GRACE_MS) {
    return {
      kind: 'missed_plan',
      availableAt: new Date(startsAt.getTime() + MISSED_GRACE_MS),
    };
  }
  return null;
}
