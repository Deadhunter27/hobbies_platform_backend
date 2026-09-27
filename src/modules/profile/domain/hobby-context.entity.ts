import { Entity } from '@shared/domain';
import { DomainRuleViolation } from '@shared/errors';

export const EXPERIENCE_LEVELS = [
  'exploring',
  'beginner',
  'returning',
  'regular',
  'experienced',
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const PROFILE_INTENTS = ['start', 'improve', 'social', 'explore'] as const;
export type ProfileIntent = (typeof PROFILE_INTENTS)[number];

export const SOCIAL_PREFERENCES = ['solo', 'mixed', 'social'] as const;
export type SocialPreference = (typeof SOCIAL_PREFERENCES)[number];

export interface HobbyContextProps {
  id: string;
  userId: string;
  hobbyId: string;
  experienceLevel: ExperienceLevel;
  primaryIntent: ProfileIntent;
  secondaryIntents: ProfileIntent[];
  goal: string | null;
  socialPreference: SocialPreference;
  createdAt: Date;
  updatedAt: Date;
}

function assertIntentRules(primaryIntent: ProfileIntent, secondaryIntents: ProfileIntent[]): void {
  if (secondaryIntents.includes(primaryIntent)) {
    throw new DomainRuleViolation(
      'Primary intent cannot also be a secondary intent.',
      undefined,
      'PROFILE_DUPLICATE_PRIMARY_INTENT',
    );
  }
  if (new Set(secondaryIntents).size !== secondaryIntents.length) {
    throw new DomainRuleViolation(
      'Secondary intents must be unique.',
      undefined,
      'PROFILE_DUPLICATE_SECONDARY_INTENT',
    );
  }
}

export class HobbyContext extends Entity {
  private constructor(private readonly props: HobbyContextProps) {
    super(props.id);
  }

  static reconstitute(props: HobbyContextProps): HobbyContext {
    assertIntentRules(props.primaryIntent, props.secondaryIntents);
    return new HobbyContext(props);
  }

  static create(
    input: Omit<HobbyContextProps, 'createdAt' | 'updatedAt'>,
    now = new Date(),
  ): HobbyContext {
    assertIntentRules(input.primaryIntent, input.secondaryIntents);
    return new HobbyContext({ ...input, createdAt: now, updatedAt: now });
  }

  get userId(): string {
    return this.props.userId;
  }

  get hobbyId(): string {
    return this.props.hobbyId;
  }

  get experienceLevel(): ExperienceLevel {
    return this.props.experienceLevel;
  }

  get primaryIntent(): ProfileIntent {
    return this.props.primaryIntent;
  }

  get secondaryIntents(): ProfileIntent[] {
    return [...this.props.secondaryIntents];
  }

  get goal(): string | null {
    return this.props.goal;
  }

  get socialPreference(): SocialPreference {
    return this.props.socialPreference;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
