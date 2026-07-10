import type { FileMoveResult } from '../types/Common';
import type { ExecuteNoteMoveWithConflictResult } from './execute-note-move-with-conflict';

export interface MoveSkippedCounts {
  missingFolder: number;
  conflict: number;
}

/** True when a move was skipped because the destination folder is missing. */
export function isMissingFolderSkipOutcome(result: FileMoveResult): boolean {
  return !result.moved && result.skipReason === 'missing_destination_folder';
}

/** True when a move was skipped because of a naming conflict (or cached skip). */
export function isConflictSkipFileMoveOutcome(result: FileMoveResult): boolean {
  return (
    !result.moved &&
    (result.skipReason === 'conflict_skip' ||
      result.skipReason === 'cached_conflict_skip')
  );
}

/** True when a move was not performed because of a naming conflict skip. */
export function isNoteMoveConflictSkipOutcome(
  outcome: ExecuteNoteMoveWithConflictResult
): boolean {
  return (
    !outcome.moved &&
    (outcome.reason === 'skip' || outcome.reason === 'cached_skip')
  );
}

/** Maps a conflict-handling outcome to a {@link FileMoveResult} skip reason. */
export function fileMoveResultFromConflictOutcome(
  outcome: ExecuteNoteMoveWithConflictResult
): FileMoveResult {
  if (outcome.moved) {
    return { moved: true, targetFolder: outcome.targetFolder };
  }
  if (outcome.reason === 'skip') {
    return { moved: false, skipReason: 'conflict_skip' };
  }
  if (outcome.reason === 'cached_skip') {
    return { moved: false, skipReason: 'cached_conflict_skip' };
  }
  return { moved: false };
}

/** Formats aggregated skip counts for bulk / preview completion notices. */
export function formatMoveSkippedDetail(counts: MoveSkippedCounts): string {
  const total = counts.missingFolder + counts.conflict;
  if (total === 0) {
    return '';
  }

  const parts: string[] = [];
  if (counts.missingFolder > 0) {
    parts.push(`${counts.missingFolder} skipped (destination folder missing)`);
  }
  if (counts.conflict > 0) {
    parts.push(`${counts.conflict} skipped due to conflicts`);
  }
  return ` ${parts.join(', ')}.`;
}
