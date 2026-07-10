import { describe, expect, it } from 'vitest';
import { isNoteMoveConflictSkipOutcome } from './note-move-conflict-skip-outcome';

describe('isNoteMoveConflictSkipOutcome', () => {
  it('returns true for interactive skip outcomes', () => {
    expect(
      isNoteMoveConflictSkipOutcome({ moved: false, reason: 'skip' })
    ).toBe(true);
  });

  it('returns true for cached conflict skip outcomes', () => {
    expect(
      isNoteMoveConflictSkipOutcome({ moved: false, reason: 'cached_skip' })
    ).toBe(true);
  });

  it('returns false for unchanged outcomes', () => {
    expect(
      isNoteMoveConflictSkipOutcome({ moved: false, reason: 'unchanged' })
    ).toBe(false);
  });

  it('returns false for successful moves', () => {
    expect(isNoteMoveConflictSkipOutcome({ moved: true })).toBe(false);
  });
});
