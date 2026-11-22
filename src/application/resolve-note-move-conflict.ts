import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { buildRenamedFileName } from '../domain/conflicts/note-move-conflict';
import { combinePath, getParentPath } from '../utils/PathUtils';
import { createError } from '../utils/Error';
import type {
  ConflictResolutionAction,
  ConflictRun,
  ResolvedNoteMovePath,
} from '../types/ConflictResolution';
import { showConflictModalForNote } from './conflict-modal-coordinator';
import { getConflictResolutionSettings } from '../utils/conflict-resolution-settings';
import type { SettingsData } from '../types/PluginData';
import {
  countWords,
  describeEdited,
} from '../domain/conflicts/conflict-details';
import { fill, plural, strings } from '../i18n/locale';
import type { ConflictModalOptions } from '../modals/ConflictModal';
import type { ConflictSkipCacheManager } from '../core/ConflictSkipCacheManager';

export interface ResolveNoteMoveConflictOptions {
  app: App;
  settings: SettingsData;
  sourcePath: string;
  targetFolder: string;
  fileName: string;
  basename: string;
  extension: string;
  newPath: string;
  interactive: boolean;
  bypassConflictSkipCache?: boolean;
  conflictSkipCache?: ConflictSkipCacheManager;
  conflictRun?: ConflictRun;
}

export type NoteMoveConflictOutcome =
  | { status: 'no_conflict' }
  | { status: 'skip' }
  | { status: 'deduplicated' }
  | { status: 'resolved'; resolved: ResolvedNoteMovePath };

/** Returns true when another file already occupies the target path. */
export async function hasNoteMoveConflict(
  app: App,
  sourcePath: string,
  targetPath: string
): Promise<boolean> {
  const exists = await app.vault.adapter.exists(targetPath);
  if (!exists) {
    return false;
  }
  return sourcePath !== targetPath;
}

/** Finds the first available renamed path in the target folder. */
export async function findUniqueRenamedPath(
  app: App,
  targetFolder: string,
  basename: string,
  extension: string
): Promise<string> {
  for (let counter = 1; counter <= 999; counter++) {
    const renamedFileName = buildRenamedFileName(basename, extension, counter);
    const candidatePath = combinePath(targetFolder, renamedFileName);
    const exists = await app.vault.adapter.exists(candidatePath);
    if (!exists) {
      return candidatePath;
    }
  }
  throw new Error(
    'Could not find an available renamed path after 999 attempts'
  );
}

async function removeExistingTargetFile(
  app: App,
  targetPath: string
): Promise<void> {
  // Vault naming conflicts are virtually always TFiles; guard non-file paths defensively.
  const existing = app.vault.getAbstractFileByPath(targetPath);
  if (existing instanceof TFile) {
    await app.fileManager.trashFile(existing);
    return;
  }
  if (await app.vault.adapter.exists(targetPath)) {
    throw createError(
      `Cannot overwrite "${targetPath}": destination exists but is not a file`
    );
  }
}

async function resolveWithStrategy(
  app: App,
  action: Exclude<ConflictResolutionAction, 'skip'>,
  options: ResolveNoteMoveConflictOptions
): Promise<ResolvedNoteMovePath> {
  if (action === 'rename') {
    const renamedPath = await findUniqueRenamedPath(
      app,
      options.targetFolder,
      options.basename,
      options.extension
    );
    return { newPath: renamedPath, action: 'rename' };
  }

  return { newPath: options.newPath, action: 'overwrite' };
}

/** Removes the conflicting destination file immediately before an overwrite move. */
export async function removeConflictingTargetForOverwrite(
  app: App,
  targetPath: string
): Promise<void> {
  await removeExistingTargetFile(app, targetPath);
}

async function describeFile(app: App, path: string) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return '';
  const copy = strings().modals;
  const when = describeEdited(file.stat.mtime, Date.now());
  const edited =
    when.kind === 'today'
      ? fill(copy.conflictEditedToday, { time: when.time })
      : fill(copy.conflictEditedOn, { date: when.date });
  const words = countWords(await app.vault.cachedRead(file));
  return `${edited} · ${plural(words, 'word')}`;
}

async function describeConflict(
  options: ResolveNoteMoveConflictOptions,
  otherConflicts: number
): Promise<ConflictModalOptions> {
  const { app } = options;
  const renamedPath = await findUniqueRenamedPath(
    app,
    options.targetFolder,
    options.basename,
    options.extension
  );
  return {
    sourcePath: options.sourcePath,
    targetPath: options.newPath,
    noteName: options.basename,
    targetFolder: options.targetFolder,
    renamedName: (renamedPath.split('/').pop() ?? '').slice(
      0,
      options.extension ? -(options.extension.length + 1) : undefined
    ),
    moving: {
      folder: getParentPath(options.sourcePath),
      details: await describeFile(app, options.sourcePath),
    },
    existing: {
      folder: options.targetFolder,
      details: await describeFile(app, options.newPath),
    },
    otherConflicts,
  };
}

/** Number of moves that would hit an existing note, for the "other conflicts" checkbox. */
export async function countNoteMoveConflicts(
  app: App,
  moves: readonly { sourcePath: string; newPath: string }[]
): Promise<number> {
  let count = 0;
  for (const move of moves) {
    if (await hasNoteMoveConflict(app, move.sourcePath, move.newPath)) count++;
  }
  return count;
}

/**
 * Determines how to proceed when the target path is already taken.
 * Shows ConflictModal when strategy is "ask" and the move is interactive.
 */
export async function resolveNoteMoveConflict(
  options: ResolveNoteMoveConflictOptions
): Promise<NoteMoveConflictOutcome> {
  const conflict = await hasNoteMoveConflict(
    options.app,
    options.sourcePath,
    options.newPath
  );
  if (!conflict) {
    return { status: 'no_conflict' };
  }

  const bypassSkipCache = options.bypassConflictSkipCache === true;
  const forceInteractivePrompt = bypassSkipCache && options.interactive;

  if (
    !bypassSkipCache &&
    options.conflictSkipCache?.isSkippedOrPending(
      options.sourcePath,
      options.newPath
    )
  ) {
    return { status: 'skip' };
  }

  const { strategy } = getConflictResolutionSettings(options.settings);
  let action: ConflictResolutionAction;

  options.conflictSkipCache?.markPending(options.sourcePath, options.newPath);

  try {
    if ((strategy === 'ask' || forceInteractivePrompt) && options.interactive) {
      const run = options.conflictRun;
      if (run?.sticky) {
        action = run.sticky;
        run.remaining--;
      } else {
        const modalResult = await showConflictModalForNote(
          options.app,
          await describeConflict(options, run ? run.remaining - 1 : 0)
        );
        if (!modalResult.shouldApplyResult) {
          return { status: 'deduplicated' };
        }
        action = modalResult.action;
        if (run) {
          run.remaining--;
          if (modalResult.applyToRest) run.sticky = action;
        }
      }
    } else if (strategy !== 'ask') {
      action = strategy;
    } else {
      action = 'skip';
    }

    if (action === 'skip') {
      return { status: 'skip' };
    }

    const resolved = await resolveWithStrategy(options.app, action, options);
    return { status: 'resolved', resolved };
  } finally {
    options.conflictSkipCache?.clearPending(
      options.sourcePath,
      options.newPath
    );
  }
}
