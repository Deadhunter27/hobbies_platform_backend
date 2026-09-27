import { Entity } from '@shared/domain';
import { DomainRuleViolation } from '@shared/errors';

export const ACTIVITY_EFFORT_LEVELS = ['easy', 'moderate', 'challenging', 'open'] as const;
export type ActivityEffortLevel = (typeof ACTIVITY_EFFORT_LEVELS)[number];

export const ACTIVITY_STATUSES = ['draft', 'published', 'cancelled', 'completed'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export interface ActivityProps {
  id: string;
  hobbyId: string;
  title: string;
  description: string | null;
  activityType: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  placeName: string;
  addressLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  hostName: string | null;
  hostType: string | null;
  hostReferenceId: string | null;
  communityReferenceId: string | null;
  effortLevel: ActivityEffortLevel;
  capacity: number | null;
  status: ActivityStatus;
  preparation: string;
  expectations: string;
  createdAt: Date;
  updatedAt: Date;
}

function assertActivityRules(props: ActivityProps): void {
  if (props.endsAt && props.endsAt <= props.startsAt) {
    throw new DomainRuleViolation(
      'Activity end time must be after the start time.',
      undefined,
      'ACTIVITY_INVALID_TIME_WINDOW',
    );
  }
  if (props.capacity !== null && (!Number.isInteger(props.capacity) || props.capacity <= 0)) {
    throw new DomainRuleViolation(
      'Activity capacity must be a positive integer when supplied.',
      undefined,
      'ACTIVITY_INVALID_CAPACITY',
    );
  }
  if (props.latitude !== null && (props.latitude < -90 || props.latitude > 90)) {
    throw new DomainRuleViolation(
      'Activity latitude must be between -90 and 90.',
      undefined,
      'ACTIVITY_INVALID_LATITUDE',
    );
  }
  if (props.longitude !== null && (props.longitude < -180 || props.longitude > 180)) {
    throw new DomainRuleViolation(
      'Activity longitude must be between -180 and 180.',
      undefined,
      'ACTIVITY_INVALID_LONGITUDE',
    );
  }
}

export class Activity extends Entity {
  private constructor(private readonly props: ActivityProps) {
    super(props.id);
  }

  static reconstitute(props: ActivityProps): Activity {
    assertActivityRules(props);
    return new Activity(props);
  }

  get hobbyId(): string {
    return this.props.hobbyId;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string | null {
    return this.props.description;
  }
  get activityType(): string {
    return this.props.activityType;
  }
  get startsAt(): Date {
    return this.props.startsAt;
  }
  get endsAt(): Date | null {
    return this.props.endsAt;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  get placeName(): string {
    return this.props.placeName;
  }
  get addressLabel(): string | null {
    return this.props.addressLabel;
  }
  get latitude(): number | null {
    return this.props.latitude;
  }
  get longitude(): number | null {
    return this.props.longitude;
  }
  get hostName(): string | null {
    return this.props.hostName;
  }
  get hostType(): string | null {
    return this.props.hostType;
  }
  get hostReferenceId(): string | null {
    return this.props.hostReferenceId;
  }
  get communityReferenceId(): string | null {
    return this.props.communityReferenceId;
  }
  get effortLevel(): ActivityEffortLevel {
    return this.props.effortLevel;
  }
  get capacity(): number | null {
    return this.props.capacity;
  }
  get status(): ActivityStatus {
    return this.props.status;
  }
  get preparation(): string {
    return this.props.preparation;
  }
  get expectations(): string {
    return this.props.expectations;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  canAcceptCommitment(now = new Date()): boolean {
    return this.status === 'published' && this.startsAt > now;
  }
}
