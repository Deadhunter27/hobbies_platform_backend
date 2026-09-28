import { Entity } from '@shared/domain';
import { DomainRuleViolation } from '@shared/errors';

export interface ProgressReflectionProps {
  id: string;
  userId: string;
  hobbyId: string;
  activityId: string;
  rating: number | null;
  tags: string[];
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function assertRules(props: ProgressReflectionProps): void {
  if (props.rating !== null && (!Number.isInteger(props.rating) || props.rating < 1 || props.rating > 5)) {
    throw new DomainRuleViolation(
      'Reflection rating must be an integer from 1 to 5.',
      undefined,
      'PROGRESS_INVALID_RATING',
    );
  }
  if (props.tags.length > 8) {
    throw new DomainRuleViolation(
      'A reflection can contain at most 8 tags.',
      undefined,
      'PROGRESS_TOO_MANY_TAGS',
    );
  }
  if (props.tags.some((tag) => tag.length > 64)) {
    throw new DomainRuleViolation(
      'Reflection tags must be 64 characters or fewer.',
      undefined,
      'PROGRESS_TAG_TOO_LONG',
    );
  }
  if (props.rating === null && props.tags.length === 0 && props.note === null) {
    throw new DomainRuleViolation(
      'A reflection needs at least one meaningful signal.',
      undefined,
      'PROGRESS_EMPTY_REFLECTION',
    );
  }
}

export class ProgressReflection extends Entity {
  private constructor(private readonly props: ProgressReflectionProps) {
    super(props.id);
  }

  static create(
    input: Omit<ProgressReflectionProps, 'tags' | 'createdAt' | 'updatedAt'> & { tags: string[] },
    now = new Date(),
  ): ProgressReflection {
    const props: ProgressReflectionProps = {
      ...input,
      tags: normalizeTags(input.tags),
      createdAt: now,
      updatedAt: now,
    };
    assertRules(props);
    return new ProgressReflection(props);
  }

  static reconstitute(props: ProgressReflectionProps): ProgressReflection {
    const normalized = { ...props, tags: normalizeTags(props.tags) };
    assertRules(normalized);
    return new ProgressReflection(normalized);
  }

  revise(
    input: { rating: number | null; tags: string[]; note: string | null },
    now = new Date(),
  ): ProgressReflection {
    return ProgressReflection.reconstitute({
      ...this.props,
      rating: input.rating,
      tags: normalizeTags(input.tags),
      note: input.note,
      updatedAt: now,
    });
  }

  get userId(): string {
    return this.props.userId;
  }
  get hobbyId(): string {
    return this.props.hobbyId;
  }
  get activityId(): string {
    return this.props.activityId;
  }
  get rating(): number | null {
    return this.props.rating;
  }
  get tags(): string[] {
    return [...this.props.tags];
  }
  get note(): string | null {
    return this.props.note;
  }
  get occurredAt(): Date {
    return this.props.occurredAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
