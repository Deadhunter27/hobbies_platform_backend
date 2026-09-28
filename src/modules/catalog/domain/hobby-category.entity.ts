import { Entity } from '@shared/domain';
import { Slug } from './value-objects/slug.vo';

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

export interface CreateHobbyCategoryProps {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

export interface UpdateHobbyCategoryProps {
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

export class HobbyCategory extends Entity {
  private constructor(private readonly props: HobbyCategoryProps) {
    super(props.id);
  }

  static create(input: CreateHobbyCategoryProps, now = new Date()): HobbyCategory {
    return new HobbyCategory({
      ...input,
      name: input.name.trim(),
      slug: Slug.create(input.slug).toString(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: HobbyCategoryProps): HobbyCategory {
    return new HobbyCategory(props);
  }

  update(input: UpdateHobbyCategoryProps, now = new Date()): HobbyCategory {
    return new HobbyCategory({
      ...this.props,
      ...input,
      name: input.name.trim(),
      slug: Slug.create(input.slug).toString(),
      updatedAt: now,
    });
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
