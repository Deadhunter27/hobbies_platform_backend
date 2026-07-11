import { Entity } from '@shared/domain';

export interface HobbyCategoryProps {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * M1 is read-only, so this aggregate only ever gets reconstituted from
 * persisted rows — a `create()` factory arrives with the write endpoints.
 */
export class HobbyCategory extends Entity {
  private constructor(private readonly props: HobbyCategoryProps) {
    super(props.id);
  }

  static reconstitute(props: HobbyCategoryProps): HobbyCategory {
    return new HobbyCategory(props);
  }

  get parentId(): string | null {
    return this.props.parentId;
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

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
