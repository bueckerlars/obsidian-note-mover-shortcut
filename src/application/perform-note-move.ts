import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { buildAttachmentMovePlans } from '../domain/attachments/note-attachments';
import {
  coMoveAttachmentsAfterNoteRename,
  type AttachmentMoveRecord,
} from './co-move-attachments-on-note-move';
import type { AttachmentMoveSettings } from '../types/PluginData';
import type { HistoryManager } from '../core/HistoryManager';
import { deleteEmptyAssetFoldersAfterMove } from '../domain/attachments/delete-empty-asset-folders';
import { removeConflictingTargetForOverwrite } from './resolve-note-move-conflict';

export interface PerformNoteMoveOptions {
  app: App;
  historyManager: HistoryManager;
  file: TFile;
  originalPath: string;
  newPath: string;
  attachmentSettings: AttachmentMoveSettings;
  /** When set, trashes the conflicting destination file before renaming. */
  overwriteTargetPath?: string;
  /** Runs after a successful rename while the plugin-move guard is still active. */
  beforePluginMoveEnd?: () => Promise<void>;
}

async function readTargetBackup(
  app: App,
  targetPath: string
): Promise<string | null> {
  const targetFile = app.vault.getAbstractFileByPath(targetPath);
  if (!(targetFile instanceof TFile)) {
    return null;
  }
  return app.vault.read(targetFile);
}

async function restoreTargetBackup(
  app: App,
  targetPath: string,
  content: string
): Promise<void> {
  if (await app.vault.adapter.exists(targetPath)) {
    return;
  }
  await app.vault.create(targetPath, content);
}

/**
 * Renames a note and optionally co-moves referenced attachments, recording history.
 */
export async function performNoteMove(
  options: PerformNoteMoveOptions
): Promise<AttachmentMoveRecord[]> {
  const {
    app,
    historyManager,
    file,
    originalPath,
    newPath,
    attachmentSettings,
    overwriteTargetPath,
    beforePluginMoveEnd,
  } = options;

  const shouldCoMove =
    attachmentSettings.moveWithNote && file.extension === 'md';

  const attachmentPlans = shouldCoMove
    ? buildAttachmentMovePlans(app, file, originalPath, newPath, {
        skipSharedAttachments: attachmentSettings.skipSharedAttachments,
      })
    : [];

  const targetBackup =
    overwriteTargetPath != null
      ? await readTargetBackup(app, overwriteTargetPath)
      : null;

  historyManager.markPluginMoveStart();
  try {
    if (overwriteTargetPath) {
      await removeConflictingTargetForOverwrite(app, overwriteTargetPath);
    }

    try {
      await app.fileManager.renameFile(file, newPath);
    } catch (error) {
      if (targetBackup != null && overwriteTargetPath) {
        await restoreTargetBackup(app, overwriteTargetPath, targetBackup);
      }
      throw error;
    }

    let attachmentMoves: AttachmentMoveRecord[] = [];
    if (attachmentPlans.length > 0) {
      attachmentMoves = await coMoveAttachmentsAfterNoteRename(app, {
        plans: attachmentPlans,
      });

      if (
        attachmentSettings.deleteEmptyAssetFolders &&
        attachmentMoves.length > 0
      ) {
        await deleteEmptyAssetFoldersAfterMove(app, attachmentMoves);
      }
    }

    historyManager.addEntry({
      sourcePath: originalPath,
      destinationPath: newPath,
      fileName: file.name,
      attachmentMoves: attachmentMoves.length > 0 ? attachmentMoves : undefined,
    });

    await beforePluginMoveEnd?.();

    return attachmentMoves;
  } finally {
    historyManager.markPluginMoveEnd();
  }
}
