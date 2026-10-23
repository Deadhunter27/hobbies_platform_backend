import { visibleMediaCount } from './post.types';

describe('visibleMediaCount', () => {
  it('shows everything to signed-in viewers', () => {
    expect(visibleMediaCount(4, true, 0.2)).toBe(4);
  });

  it('shows a rounded-up share, at least one, to signed-out viewers', () => {
    expect(visibleMediaCount(1, false, 0.2)).toBe(1);
    expect(visibleMediaCount(4, false, 0.2)).toBe(1);
    expect(visibleMediaCount(4, false, 0.5)).toBe(2);
    expect(visibleMediaCount(4, false, 0)).toBe(1);
    expect(visibleMediaCount(4, false, 1)).toBe(4);
  });

  it('never exceeds what exists', () => {
    expect(visibleMediaCount(0, false, 0.2)).toBe(0);
    expect(visibleMediaCount(2, false, 1)).toBe(2);
  });
});
