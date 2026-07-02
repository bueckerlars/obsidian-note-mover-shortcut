import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { buildRenamedFileName } from '../domain/conflicts/note-move-conflict';
import { combinePath } from '../utils/PathUtils';
import type {
  ConflictResolutionAction,
  ConflictResolutionStrategy,
  ResolvedNoteMovePath,
} from '../types/ConflictResolution';
import { ConflictModal } from '../modals/ConflictModal';
import { getConflictResolutionSettings } from '../utils/conflict-resolution-settings';
import type { SettingsData } from '../types/PluginData';
import { conflictActionToStrategy } from '../domain/conflicts/note-move-conflict';

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
  onPersistStrategy?: (strategy: ConflictResolutionStrategy) => Promise<void>;
}

export type NoteMoveConflictOutcome =
  | { status: 'no_conflict' }
  | { status: 'skip' }
  | { status: 'cancel' }
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
  const existing = app.vault.getAbstractFileByPath(targetPath);
  if (existing instanceof TFile) {
    await app.fileManager.trashFile(existing);
  }
}

async function resolveWithStrategy(
  app: App,
  action: Exclude<ConflictResolutionAction, 'cancel' | 'skip'>,
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

  await removeExistingTargetFile(app, options.newPath);
  return { newPath: options.newPath, action: 'overwrite' };
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

  const { strategy } = getConflictResolutionSettings(options.settings);
  let action: ConflictResolutionAction;

  if (strategy === 'ask' && options.interactive) {
    const modalResult = await ConflictModal.show(options.app, {
      title: 'File already exists',
      fileName: options.fileName,
      sourcePath: options.sourcePath,
      targetPath: options.newPath,
    });
    action = modalResult.action;

    if (modalResult.applyAlways && action !== 'cancel') {
      const persistedStrategy = conflictActionToStrategy(action);
      await options.onPersistStrategy?.(persistedStrategy);
    }
  } else if (strategy === 'ask') {
    action = 'skip';
  } else {
    action = strategy;
  }

  if (action === 'cancel') {
    return { status: 'cancel' };
  }
  if (action === 'skip') {
    return { status: 'skip' };
  }

  const resolved = await resolveWithStrategy(options.app, action, options);
  return { status: 'resolved', resolved };
}
