import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { buildAttachmentMovePlans } from '../domain/attachments/note-attachments';
import {
  coMoveAttachmentsAfterNoteRename,
  type AttachmentMoveRecord,
} from './co-move-attachments-on-note-move';
import type { AttachmentMoveSettings } from '../types/PluginData';
import type { HistoryManager } from '../core/HistoryManager';

export interface PerformNoteMoveOptions {
  app: App;
  historyManager: HistoryManager;
  file: TFile;
  originalPath: string;
  newPath: string;
  attachmentSettings: AttachmentMoveSettings;
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
  } = options;

  const shouldCoMove =
    attachmentSettings.moveWithNote && file.extension === 'md';

  const attachmentPlans = shouldCoMove
    ? buildAttachmentMovePlans(app, file, originalPath, newPath, {
        skipSharedAttachments: attachmentSettings.skipSharedAttachments,
      })
    : [];

  historyManager.markPluginMoveStart();
  try {
    await app.fileManager.renameFile(file, newPath);

    let attachmentMoves: AttachmentMoveRecord[] = [];
    if (attachmentPlans.length > 0) {
      attachmentMoves = await coMoveAttachmentsAfterNoteRename(app, {
        plans: attachmentPlans,
      });
    }

    historyManager.addEntry({
      sourcePath: originalPath,
      destinationPath: newPath,
      fileName: file.name,
      attachmentMoves: attachmentMoves.length > 0 ? attachmentMoves : undefined,
    });

    return attachmentMoves;
  } finally {
    historyManager.markPluginMoveEnd();
  }
}
