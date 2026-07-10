import { describe, it, expect } from 'vitest';
import {
  formatMoveSkippedDetail,
  fileMoveResultFromConflictOutcome,
  isConflictSkipFileMoveOutcome,
  isMissingFolderSkipOutcome,
  isNoteMoveConflictSkipOutcome,
} from './note-move-skip-outcome';

describe('formatMoveSkippedDetail', () => {
  it('returns empty string when nothing was skipped', () => {
    expect(formatMoveSkippedDetail({ missingFolder: 0, conflict: 0 })).toBe('');
  });

  it('formats missing-folder skips only', () => {
    expect(formatMoveSkippedDetail({ missingFolder: 3, conflict: 0 })).toBe(
      ' 3 skipped (destination folder missing).'
    );
  });

  it('formats conflict skips only', () => {
    expect(formatMoveSkippedDetail({ missingFolder: 0, conflict: 2 })).toBe(
      ' 2 skipped due to conflicts.'
    );
  });

  it('formats combined skip counts', () => {
    expect(formatMoveSkippedDetail({ missingFolder: 1, conflict: 4 })).toBe(
      ' 1 skipped (destination folder missing), 4 skipped due to conflicts.'
    );
  });
});

describe('isMissingFolderSkipOutcome', () => {
  it('detects missing destination folder skips', () => {
    expect(
      isMissingFolderSkipOutcome({
        moved: false,
        skipReason: 'missing_destination_folder',
      })
    ).toBe(true);
    expect(isMissingFolderSkipOutcome({ moved: false })).toBe(false);
    expect(isMissingFolderSkipOutcome({ moved: true, targetFolder: 'A' })).toBe(
      false
    );
  });
});

describe('isConflictSkipFileMoveOutcome', () => {
  it('detects conflict and cached conflict skips', () => {
    expect(
      isConflictSkipFileMoveOutcome({
        moved: false,
        skipReason: 'conflict_skip',
      })
    ).toBe(true);
    expect(
      isConflictSkipFileMoveOutcome({
        moved: false,
        skipReason: 'cached_conflict_skip',
      })
    ).toBe(true);
    expect(
      isConflictSkipFileMoveOutcome({
        moved: false,
        skipReason: 'missing_destination_folder',
      })
    ).toBe(false);
  });
});

describe('isNoteMoveConflictSkipOutcome', () => {
  it('detects conflict skip reasons from execute outcome', () => {
    expect(
      isNoteMoveConflictSkipOutcome({ moved: false, reason: 'skip' })
    ).toBe(true);
    expect(
      isNoteMoveConflictSkipOutcome({ moved: false, reason: 'cached_skip' })
    ).toBe(true);
    expect(
      isNoteMoveConflictSkipOutcome({ moved: false, reason: 'unchanged' })
    ).toBe(false);
  });
});

describe('fileMoveResultFromConflictOutcome', () => {
  it('maps conflict skip reasons to FileMoveResult', () => {
    expect(
      fileMoveResultFromConflictOutcome({ moved: false, reason: 'skip' })
    ).toEqual({ moved: false, skipReason: 'conflict_skip' });
    expect(
      fileMoveResultFromConflictOutcome({ moved: false, reason: 'cached_skip' })
    ).toEqual({ moved: false, skipReason: 'cached_conflict_skip' });
    expect(
      fileMoveResultFromConflictOutcome({ moved: false, reason: 'unchanged' })
    ).toEqual({ moved: false });
  });
});
