import type { App } from 'obsidian';
import type { TFile } from 'obsidian';
import type { HistoryManager } from '../core/HistoryManager';
import type { AttachmentMoveSettings } from '../types/PluginData';
import type { SettingsData } from '../types/PluginData';
import type { ConflictResolutionStrategy } from '../types/ConflictResolution';
import { performNoteMove } from './perform-note-move';
import { resolveNoteMoveConflict } from './resolve-note-move-conflict';
import { NoticeManager } from '../utils/NoticeManager';
import { combinePath, getParentPath } from '../utils/PathUtils';

export interface ExecuteNoteMoveWithConflictOptions {
  app: App;
  settings: SettingsData;
  historyManager: HistoryManager;
  file: TFile;
  originalPath: string;
  targetFolder: string;
  attachmentSettings: AttachmentMoveSettings;
  interactive: boolean;
  onPersistStrategy?: (strategy: ConflictResolutionStrategy) => Promise<void>;
}

export type ExecuteNoteMoveWithConflictResult =
  | { moved: true; newPath: string; targetFolder: string }
  | { moved: false; reason: 'skip' | 'cancel' | 'unchanged' };

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
    onPersistStrategy,
  } = options;

  const newPath = combinePath(targetFolder, file.name);
  if (originalPath === newPath) {
    return { moved: false, reason: 'unchanged' };
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
    onPersistStrategy,
  });

  if (conflictOutcome.status === 'skip') {
    NoticeManager.warning(
      `Skipped "${file.basename}": a file already exists at the destination.`
    );
    return { moved: false, reason: 'skip' };
  }

  if (conflictOutcome.status === 'cancel') {
    return { moved: false, reason: 'cancel' };
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
}
