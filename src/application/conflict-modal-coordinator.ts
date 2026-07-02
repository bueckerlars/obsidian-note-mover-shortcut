import type { App } from 'obsidian';
import {
  ConflictModal,
  type ConflictModalOptions,
} from '../modals/ConflictModal';
import type { ConflictModalResult } from '../types/ConflictResolution';
import { normalizeConflictCachePath } from '../domain/conflicts/conflict-skip-cache';

const pendingBySourcePath = new Map<string, Promise<ConflictModalResult>>();

/**
 * Ensures at most one conflict modal is open per source note.
 * Concurrent callers await the same user decision.
 */
export async function showConflictModalForNote(
  app: App,
  options: ConflictModalOptions
): Promise<ConflictModalResult> {
  const sourceKey = normalizeConflictCachePath(options.sourcePath);
  const existing = pendingBySourcePath.get(sourceKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const modal = new ConflictModal(app, options);
    return modal.resolve();
  })();

  pendingBySourcePath.set(sourceKey, promise);

  try {
    return await promise;
  } finally {
    if (pendingBySourcePath.get(sourceKey) === promise) {
      pendingBySourcePath.delete(sourceKey);
    }
  }
}

/** @internal Test helper */
export function clearConflictModalCoordinatorForTests(): void {
  pendingBySourcePath.clear();
}
