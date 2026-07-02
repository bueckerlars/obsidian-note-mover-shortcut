import type {
  ConflictResolutionAction,
  ConflictResolutionStrategy,
} from '../../types/ConflictResolution';

/**
 * Builds a renamed file name by appending a numeric suffix before the extension.
 * Example: note.md + 1 -> note (1).md
 */
export function buildRenamedFileName(
  basename: string,
  extension: string,
  counter: number
): string {
  const suffix = ` (${counter})`;
  if (extension) {
    return `${basename}${suffix}.${extension}`;
  }
  return `${basename}${suffix}`;
}

/** Maps a per-note action to a persisted default strategy. */
export function conflictActionToStrategy(
  action: ConflictResolutionAction
): ConflictResolutionStrategy {
  return action;
}

export function isAutoAppliedStrategy(
  strategy: ConflictResolutionStrategy
): strategy is Exclude<ConflictResolutionStrategy, 'ask'> {
  return strategy !== 'ask';
}

export function strategyRequiresWarning(
  strategy: ConflictResolutionStrategy
): boolean {
  return strategy === 'overwrite';
}

export function actionRequiresWarning(
  action: ConflictResolutionAction
): boolean {
  return action === 'overwrite';
}
