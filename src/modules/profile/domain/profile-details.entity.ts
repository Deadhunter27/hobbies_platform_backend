import { Entity } from '@shared/domain';

export const PROFILE_GENDERS = ['female', 'male', 'nonbinary', 'prefer_not_to_say'] as const;
export type ProfileGender = (typeof PROFILE_GENDERS)[number];

export const ACQUISITION_SOURCES = [
  'instagram',
  'tiktok',
  'friend',
  'community',
  'search',
  'event',
  'other',
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export interface ProfileDetailsProps {
  userId: string;
  handle: string | null;
  birthYear: number | null;
  gender: ProfileGender | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  acquisitionSource: AcquisitionSource | null;
  acquisitionDetail: string | null;
  avatarMediaId: string | null;
  marketingConsent: boolean;
  marketingConsentUpdatedAt: Date | null;
  introCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Fields a user may change; `undefined` means "leave as is", `null` means "clear". */
export type ProfileDetailsPatch = Partial<
  Pick<
    ProfileDetailsProps,
    | 'handle'
    | 'birthYear'
    | 'gender'
    | 'instagramHandle'
    | 'tiktokHandle'
    | 'acquisitionSource'
    | 'acquisitionDetail'
    | 'avatarMediaId'
    | 'marketingConsent'
  >
> & { introCompleted?: boolean };

/**
 * Optional, progressively collected personal details (ADR-0031). Every field is
 * optional; marketing consent defaults to off and records when it last changed.
 */
export class ProfileDetails extends Entity {
  private constructor(private readonly props: ProfileDetailsProps) {
    super(props.userId);
  }

  static reconstitute(props: ProfileDetailsProps): ProfileDetails {
    return new ProfileDetails(props);
  }

  static empty(userId: string, now = new Date()): ProfileDetails {
    return new ProfileDetails({
      userId,
      handle: null,
      birthYear: null,
      gender: null,
      instagramHandle: null,
      tiktokHandle: null,
      acquisitionSource: null,
      acquisitionDetail: null,
      avatarMediaId: null,
      marketingConsent: false,
      marketingConsentUpdatedAt: null,
      introCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  apply(patch: ProfileDetailsPatch, now = new Date()): ProfileDetails {
    const { introCompleted, marketingConsent, ...fields } = patch;
    const next: ProfileDetailsProps = { ...this.props, updatedAt: now };
    for (const [key, value] of Object.entries(fields) as Array<
      [keyof typeof fields, (typeof fields)[keyof typeof fields]]
    >) {
      if (value !== undefined) (next as unknown as Record<string, unknown>)[key] = value;
    }
    if (marketingConsent !== undefined && marketingConsent !== this.props.marketingConsent) {
      next.marketingConsent = marketingConsent;
      next.marketingConsentUpdatedAt = now;
    }
    if (introCompleted && !this.props.introCompletedAt) next.introCompletedAt = now;
    return new ProfileDetails(next);
  }

  get userId(): string {
    return this.props.userId;
  }
  get handle(): string | null {
    return this.props.handle;
  }
  get birthYear(): number | null {
    return this.props.birthYear;
  }
  get gender(): ProfileGender | null {
    return this.props.gender;
  }
  get instagramHandle(): string | null {
    return this.props.instagramHandle;
  }
  get tiktokHandle(): string | null {
    return this.props.tiktokHandle;
  }
  get acquisitionSource(): AcquisitionSource | null {
    return this.props.acquisitionSource;
  }
  get acquisitionDetail(): string | null {
    return this.props.acquisitionDetail;
  }
  get avatarMediaId(): string | null {
    return this.props.avatarMediaId;
  }
  get marketingConsent(): boolean {
    return this.props.marketingConsent;
  }
  get marketingConsentUpdatedAt(): Date | null {
    return this.props.marketingConsentUpdatedAt;
  }
  get introCompletedAt(): Date | null {
    return this.props.introCompletedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
