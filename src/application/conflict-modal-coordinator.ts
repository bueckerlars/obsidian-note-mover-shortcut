import type { App } from 'obsidian';
import {
  ConflictModal,
  type ConflictModalOptions,
} from '../modals/ConflictModal';
import type { ConflictModalResult } from '../types/ConflictResolution';
import { conflictSkipCacheKey } from '../domain/conflicts/conflict-skip-cache';

export interface ConflictModalCoordinatorResult extends ConflictModalResult {
  /** False when another concurrent caller owns applying this decision. */
  shouldApplyResult: boolean;
}

const pendingByConflictKey = new Map<
  string,
  Promise<ConflictModalCoordinatorResult>
>();

/**
 * Ensures at most one conflict modal is open per source/target pair.
 * Concurrent callers await the same user decision; only the initiator applies it.
 */
export async function showConflictModalForNote(
  app: App,
  options: ConflictModalOptions
): Promise<ConflictModalCoordinatorResult> {
  const conflictKey = conflictSkipCacheKey(
    options.sourcePath,
    options.targetPath
  );
  const existing = pendingByConflictKey.get(conflictKey);
  if (existing) {
    const result = await existing;
    return { ...result, shouldApplyResult: false };
  }

  const promise = (async (): Promise<ConflictModalCoordinatorResult> => {
    const modal = new ConflictModal(app, options);
    const result = await modal.resolve();
    return { ...result, shouldApplyResult: true };
  })();

  pendingByConflictKey.set(conflictKey, promise);

  try {
    return await promise;
  } finally {
    if (pendingByConflictKey.get(conflictKey) === promise) {
      pendingByConflictKey.delete(conflictKey);
    }
  }
}

/** @internal Test helper */
export function clearConflictModalCoordinatorForTests(): void {
  pendingByConflictKey.clear();
}
