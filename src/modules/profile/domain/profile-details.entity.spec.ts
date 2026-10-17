import { ProfileDetails } from './profile-details.entity';

const t0 = new Date('2026-10-17T00:00:00Z');
const t1 = new Date('2026-10-17T01:00:00Z');
const t2 = new Date('2026-10-17T02:00:00Z');

describe('ProfileDetails', () => {
  it('starts empty with marketing consent off', () => {
    const details = ProfileDetails.empty('U1', t0);
    expect(details.handle).toBeNull();
    expect(details.marketingConsent).toBe(false);
    expect(details.marketingConsentUpdatedAt).toBeNull();
    expect(details.introCompletedAt).toBeNull();
  });

  it('applies only provided fields and clears explicit nulls', () => {
    const first = ProfileDetails.empty('U1', t0).apply({ handle: 'reza', birthYear: 2003 }, t1);
    const second = first.apply({ birthYear: null }, t2);
    expect(second.handle).toBe('reza');
    expect(second.birthYear).toBeNull();
    expect(second.updatedAt).toEqual(t2);
  });

  it('timestamps marketing consent only when it actually changes', () => {
    const optedIn = ProfileDetails.empty('U1', t0).apply({ marketingConsent: true }, t1);
    expect(optedIn.marketingConsentUpdatedAt).toEqual(t1);
    const unchanged = optedIn.apply({ marketingConsent: true }, t2);
    expect(unchanged.marketingConsentUpdatedAt).toEqual(t1);
    const optedOut = unchanged.apply({ marketingConsent: false }, t2);
    expect(optedOut.marketingConsent).toBe(false);
    expect(optedOut.marketingConsentUpdatedAt).toEqual(t2);
  });

  it('records the first intro completion and keeps it', () => {
    const done = ProfileDetails.empty('U1', t0).apply({ introCompleted: true }, t1);
    expect(done.introCompletedAt).toEqual(t1);
    expect(done.apply({ introCompleted: true }, t2).introCompletedAt).toEqual(t1);
  });
});
