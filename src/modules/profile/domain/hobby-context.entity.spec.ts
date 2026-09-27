import { HobbyContext } from './hobby-context.entity';

describe('HobbyContext', () => {
  const base = {
    id: '01J00000000000000000000000',
    userId: '01J00000000000000000000001',
    hobbyId: '01J00000000000000000000002',
    experienceLevel: 'returning' as const,
    primaryIntent: 'start' as const,
    goal: null,
    socialPreference: 'mixed' as const,
  };

  it('creates a valid evolving hobby context', () => {
    const context = HobbyContext.create({ ...base, secondaryIntents: ['social'] });
    expect(context.primaryIntent).toBe('start');
    expect(context.secondaryIntents).toEqual(['social']);
  });

  it('rejects the primary intent repeated as a secondary intent', () => {
    expect(() => HobbyContext.create({ ...base, secondaryIntents: ['start'] })).toThrow(
      expect.objectContaining({ code: 'PROFILE_DUPLICATE_PRIMARY_INTENT' }),
    );
  });

  it('rejects duplicate secondary intents', () => {
    expect(() => HobbyContext.create({ ...base, secondaryIntents: ['social', 'social'] })).toThrow(
      expect.objectContaining({ code: 'PROFILE_DUPLICATE_SECONDARY_INTENT' }),
    );
  });
});
