import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import type { AttachmentMovePlan } from '../domain/attachments/note-attachments';
import { ensureFolderExists, getParentPath } from '../utils/PathUtils';

export interface AttachmentMoveRecord {
  sourcePath: string;
  destinationPath: string;
}

export interface CoMoveAttachmentsOptions {
  plans: AttachmentMovePlan[];
}

/**
 * Renames attachment files after their parent note has moved.
 * Skips destinations that already exist.
 */
export async function coMoveAttachmentsAfterNoteRename(
  app: App,
  options: CoMoveAttachmentsOptions
): Promise<AttachmentMoveRecord[]> {
  const moved: AttachmentMoveRecord[] = [];

  for (const plan of options.plans) {
    const destExists = await app.vault.adapter.exists(plan.destinationPath);
    if (destExists) {
      console.warn(
        `[Advanced Note Mover] Skipping attachment move; destination exists: ${plan.destinationPath}`
      );
      continue;
    }

    const destFolder = getParentPath(plan.destinationPath);
    if (destFolder && !(await ensureFolderExists(app, destFolder))) {
      console.warn(
        `[Advanced Note Mover] Failed to create folder for attachment: ${destFolder}`
      );
      continue;
    }

    const file =
      plan.file ??
      (app.vault.getAbstractFileByPath(plan.sourcePath) as TFile | null);
    if (!(file instanceof TFile)) {
      console.warn(
        `[Advanced Note Mover] Attachment not found: ${plan.sourcePath}`
      );
      continue;
    }

    try {
      await app.fileManager.renameFile(file, plan.destinationPath);
      moved.push({
        sourcePath: plan.sourcePath,
        destinationPath: plan.destinationPath,
      });
    } catch (error) {
      console.warn(
        `[Advanced Note Mover] Failed to move attachment ${plan.sourcePath}:`,
        error
      );
    }
  }

  return moved;
}
