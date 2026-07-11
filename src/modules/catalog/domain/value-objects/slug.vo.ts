import { ValidationError } from '@shared/errors';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class Slug {
  private constructor(private readonly value: string) {}

  static create(raw: string): Slug {
    if (!SLUG_REGEX.test(raw)) {
      throw new ValidationError(`"${raw}" is not a valid slug.`, [
        { path: 'slug', message: 'Must be lowercase kebab-case, e.g. "padel".' },
      ]);
    }
    return new Slug(raw);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
