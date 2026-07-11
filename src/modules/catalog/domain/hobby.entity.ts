import { Entity } from '@shared/domain';
import type { HobbyCostLevel, HobbyDifficulty, HobbySetting, HobbyStatus } from './enums';

export interface HobbyProps {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: HobbyDifficulty;
  costLevel: HobbyCostLevel;
  setting: HobbySetting;
  status: HobbyStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * M1 is read-only, so this aggregate only ever gets reconstituted from
 * persisted rows — a `create()` factory arrives with the write endpoints.
 */
export class Hobby extends Entity {
  private constructor(private readonly props: HobbyProps) {
    super(props.id);
  }

  static reconstitute(props: HobbyProps): Hobby {
    return new Hobby(props);
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get description(): string | null {
    return this.props.description;
  }

  get difficulty(): HobbyDifficulty {
    return this.props.difficulty;
  }

  get costLevel(): HobbyCostLevel {
    return this.props.costLevel;
  }

  get setting(): HobbySetting {
    return this.props.setting;
  }

  get status(): HobbyStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isActive(): boolean {
    return this.status === 'active';
  }
}
