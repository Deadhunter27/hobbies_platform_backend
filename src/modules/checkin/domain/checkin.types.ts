export const CHECK_IN_KINDS = ['activity_reminder', 'post_activity', 'missed_plan'] as const;
export type CheckInKind = (typeof CHECK_IN_KINDS)[number];

export const CHECK_IN_STATUSES = ['pending', 'actioned', 'dismissed'] as const;
export type CheckInStatus = (typeof CHECK_IN_STATUSES)[number];

export interface CheckIn {
  id: string;
  userId: string;
  activityId: string;
  kind: CheckInKind;
  status: CheckInStatus;
  availableAt: Date;
  actionedAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckInActivityContext {
  title: string;
  startsAt: Date;
  placeName: string;
}

export interface CheckInView {
  checkIn: CheckIn;
  title: string;
  body: string;
  ctaLabel: string;
  activity: CheckInActivityContext;
}
