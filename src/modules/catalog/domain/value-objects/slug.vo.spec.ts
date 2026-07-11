import { Slug } from './slug.vo';
import { ValidationError } from '@shared/errors';

describe('Slug', () => {
  it('accepts lowercase kebab-case values', () => {
    const slug = Slug.create('padel');
    expect(slug.toString()).toBe('padel');
  });

  it('accepts multi-word kebab-case values', () => {
    const slug = Slug.create('outdoors-and-nature');
    expect(slug.toString()).toBe('outdoors-and-nature');
  });

  it.each(['Padel', 'padel_racquet', 'padel racquet', '-padel', 'padel-', ''])(
    'rejects %p as an invalid slug',
    (raw) => {
      expect(() => Slug.create(raw)).toThrow(ValidationError);
    },
  );

  it('two slugs with the same value are equal', () => {
    expect(Slug.create('padel').equals(Slug.create('padel'))).toBe(true);
  });
});
