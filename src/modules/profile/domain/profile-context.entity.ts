import { Entity } from '@shared/domain';

export interface ProfileContextProps {
  userId: string;
  city: string | null;
  countryCode: string | null;
  timezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProfileContext extends Entity {
  private constructor(private readonly props: ProfileContextProps) {
    super(props.userId);
  }

  static reconstitute(props: ProfileContextProps): ProfileContext {
    return new ProfileContext(props);
  }

  static create(input: Omit<ProfileContextProps, 'createdAt' | 'updatedAt'>, now = new Date()): ProfileContext {
    return new ProfileContext({ ...input, createdAt: now, updatedAt: now });
  }

  get userId(): string { return this.props.userId; }
  get city(): string | null { return this.props.city; }
  get countryCode(): string | null { return this.props.countryCode; }
  get timezone(): string | null { return this.props.timezone; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}
