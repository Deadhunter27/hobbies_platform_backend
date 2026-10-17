import { MIN_USER_AGE, updateProfileDetailsSchema } from './profile.dto';

const parse = (input: unknown) => updateProfileDetailsSchema.safeParse(input);

describe('updateProfileDetailsSchema', () => {
  it('normalizes handles: strips "@", lowercases', () => {
    const result = parse({
      handle: '@Reza.Run',
      instagramHandle: '@RezaAulia',
      tiktokHandle: 'Reza_runs',
    });
    expect(result.success && result.data).toMatchObject({
      handle: 'reza.run',
      instagramHandle: 'rezaaulia',
      tiktokHandle: 'reza_runs',
    });
  });

  it.each(['ab', '.reza', 'reza.', 're..za', 'reza run', 'r'.repeat(31)])(
    'rejects invalid handle %p',
    (handle) => {
      expect(parse({ handle }).success).toBe(false);
    },
  );

  it('allows clearing a field with null and omitting others', () => {
    const result = parse({ handle: null });
    expect(result.success && result.data).toEqual({ handle: null });
  });

  it(`enforces a minimum age of ${MIN_USER_AGE}`, () => {
    const year = new Date().getUTCFullYear();
    expect(parse({ birthYear: year - MIN_USER_AGE }).success).toBe(true);
    expect(parse({ birthYear: year - MIN_USER_AGE + 1 }).success).toBe(false);
    expect(parse({ birthYear: 1899 }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(parse({ email: 'x@example.com' }).success).toBe(false);
  });
});
