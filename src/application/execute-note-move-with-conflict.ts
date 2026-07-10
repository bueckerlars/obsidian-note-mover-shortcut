import type { App } from 'obsidian';
import type { TFile } from 'obsidian';
import type { HistoryManager } from '../core/HistoryManager';
import type { ConflictSkipCacheManager } from '../core/ConflictSkipCacheManager';
import type { AttachmentMoveSettings } from '../types/PluginData';
import type { SettingsData } from '../types/PluginData';
import type { ConflictResolutionStrategy } from '../types/ConflictResolution';
import { performNoteMove } from './perform-note-move';
import {
  hasNoteMoveConflict,
  resolveNoteMoveConflict,
} from './resolve-note-move-conflict';
import { NoticeManager } from '../utils/NoticeManager';
import { combinePath, getParentPath } from '../utils/PathUtils';
import { getConflictResolutionSettings } from '../utils/conflict-resolution-settings';

const targetPathTailLocks = new Map<string, Promise<void>>();

async function withTargetPathLock<T>(
  targetPath: string,
  work: () => Promise<T>
): Promise<T> {
  const previousTail = targetPathTailLocks.get(targetPath) ?? Promise.resolve();
  let release!: () => void;
  const currentGate = new Promise<void>(resolve => {
    release = resolve;
  });
  const currentTail = previousTail.then(() => currentGate);
  targetPathTailLocks.set(targetPath, currentTail);

  await previousTail;
  try {
    return await work();
  } finally {
    release();
    if (targetPathTailLocks.get(targetPath) === currentTail) {
      targetPathTailLocks.delete(targetPath);
    }
  }
}

export interface ExecuteNoteMoveWithConflictOptions {
  app: App;
  settings: SettingsData;
  historyManager: HistoryManager;
  conflictSkipCache: ConflictSkipCacheManager;
  file: TFile;
  originalPath: string;
  targetFolder: string;
  attachmentSettings: AttachmentMoveSettings;
  interactive: boolean;
  bypassConflictSkipCache?: boolean;
  onPersistStrategy?: (strategy: ConflictResolutionStrategy) => Promise<void>;
}

export type ExecuteNoteMoveWithConflictResult =
  | { moved: true; newPath: string; targetFolder: string }
  | {
      moved: false;
      reason: 'skip' | 'unchanged' | 'cached_skip';
    };

/**
 * Resolves naming conflicts and performs the note move when allowed.
 */
export async function executeNoteMoveWithConflictHandling(
  options: ExecuteNoteMoveWithConflictOptions
): Promise<ExecuteNoteMoveWithConflictResult> {
  const {
    app,
    file,
    originalPath,
    targetFolder,
    attachmentSettings,
    historyManager,
    settings,
    interactive,
    conflictSkipCache,
    bypassConflictSkipCache = false,
    onPersistStrategy,
  } = options;

  const newPath = combinePath(targetFolder, file.name);
  if (originalPath === newPath) {
    return { moved: false, reason: 'unchanged' };
  }

  return withTargetPathLock(newPath, async () => {
    if (
      !bypassConflictSkipCache &&
      conflictSkipCache.isSkippedOrPending(originalPath, newPath)
    ) {
      const stillConflict = await hasNoteMoveConflict(
        app,
        originalPath,
        newPath
      );
      if (stillConflict) {
        return { moved: false, reason: 'cached_skip' };
      }
      conflictSkipCache.clearPending(originalPath, newPath);
      await conflictSkipCache.removeEntry(originalPath, newPath);
    }

    const conflictOutcome = await resolveNoteMoveConflict({
      app,
      settings,
      sourcePath: originalPath,
      targetFolder,
      fileName: file.name,
      basename: file.basename,
      extension: file.extension,
      newPath,
      interactive,
      bypassConflictSkipCache,
      conflictSkipCache,
      onPersistStrategy,
    });

    if (conflictOutcome.status === 'deduplicated') {
      return { moved: false, reason: 'unchanged' };
    }

    if (conflictOutcome.status === 'skip') {
      if (!conflictSkipCache.hasPersistedSkip(originalPath, newPath)) {
        await conflictSkipCache.addSkip(originalPath, newPath);
      }
      if (getConflictResolutionSettings(settings).strategy === 'skip') {
        NoticeManager.warning(
          `Skipped "${file.basename}": a file already exists at the destination.`
        );
      }
      return { moved: false, reason: 'skip' };
    }

    const resolvedPath =
      conflictOutcome.status === 'resolved'
        ? conflictOutcome.resolved.newPath
        : newPath;

    if (originalPath === resolvedPath) {
      return { moved: false, reason: 'unchanged' };
    }

    await performNoteMove({
      app,
      historyManager,
      file,
      originalPath,
      newPath: resolvedPath,
      attachmentSettings,
      overwriteTargetPath:
        conflictOutcome.status === 'resolved' &&
        conflictOutcome.resolved.action === 'overwrite'
          ? resolvedPath
          : undefined,
      beforePluginMoveEnd: async () => {
        await conflictSkipCache.removeForSource(originalPath);
      },
    });

    const resolvedFolder = getParentPath(resolvedPath) || targetFolder;

    if (conflictOutcome.status === 'resolved') {
      if (conflictOutcome.resolved.action === 'rename') {
        NoticeManager.info(
          `Renamed and moved "${file.basename}" to avoid a conflict.`
        );
      } else if (conflictOutcome.resolved.action === 'overwrite') {
        NoticeManager.warning(
          `Replaced existing file and moved "${file.basename}".`
        );
      }
    }

    return { moved: true, newPath: resolvedPath, targetFolder: resolvedFolder };
  });
}
