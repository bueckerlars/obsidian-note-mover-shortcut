type NoteMoveConflictSkipCheckOutcome =
  | { moved: true }
  | { moved: false; reason: 'skip' | 'unchanged' | 'cached_skip' };

/** True when a move was not performed because of a naming conflict skip. */
export function isNoteMoveConflictSkipOutcome(
  outcome: NoteMoveConflictSkipCheckOutcome
): boolean {
  return (
    !outcome.moved &&
    (outcome.reason === 'skip' || outcome.reason === 'cached_skip')
  );
}
