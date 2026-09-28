import { resolveCheckInTiming } from './checkin.use-cases';

const HOUR_MS = 60 * 60 * 1000;
const START = new Date('2026-09-28T07:00:00.000Z');

function before(hours: number): Date {
  return new Date(START.getTime() - hours * HOUR_MS);
}

function after(hours: number): Date {
  return new Date(START.getTime() + hours * HOUR_MS);
}

describe('resolveCheckInTiming', () => {
  it('returns nothing more than 24 hours before the activity', () => {
    expect(resolveCheckInTiming(START, before(25))).toBeNull();
  });

  it('returns an activity reminder inside the 24-hour window', () => {
    expect(resolveCheckInTiming(START, before(12))).toEqual({
      kind: 'activity_reminder',
      availableAt: before(24),
    });
  });

  it('starts the post-activity check-in at the activity start time', () => {
    expect(resolveCheckInTiming(START, START)).toEqual({
      kind: 'post_activity',
      availableAt: START,
    });
  });

  it('keeps post-activity active before the six-hour grace boundary', () => {
    expect(resolveCheckInTiming(START, after(5.99))?.kind).toBe('post_activity');
  });

  it('switches to missed-plan at the six-hour grace boundary', () => {
    expect(resolveCheckInTiming(START, after(6))).toEqual({
      kind: 'missed_plan',
      availableAt: after(6),
    });
  });

  it('keeps missed-plan available after the grace boundary', () => {
    expect(resolveCheckInTiming(START, after(24))?.kind).toBe('missed_plan');
  });
});
