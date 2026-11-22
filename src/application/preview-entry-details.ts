import { TFile, TFolder, type App } from 'obsidian';
import { buildAttachmentMovePlans } from '../domain/attachments/note-attachments';
import type { PreviewEntry } from '../types/MovePreview';
import type { SettingsData } from '../types/PluginData';
import { getAttachmentMoveSettings } from '../utils/attachment-settings';
import { combinePath } from '../utils/PathUtils';

export interface PreviewEntryDetails {
  /** Another note with the same name already sits in the destination. */
  conflict: boolean;
  /** Attachments that move along with the note. */
  attachments: number;
  /** The destination folder does not exist yet. */
  newFolder: boolean;
}

/** Reads what the vault says about one planned move, without changing anything. */
export function previewEntryDetails(
  app: App,
  settings: SettingsData,
  entry: PreviewEntry
): PreviewEntryDetails {
  const target = entry.targetPath ?? '';
  const newPath = combinePath(target, entry.fileName);
  const isRoot = target === '' || target === '/';
  const folder = isRoot ? null : app.vault.getAbstractFileByPath(target);
  const conflict = app.vault.getAbstractFileByPath(newPath) !== null;

  let attachments = 0;
  const source = app.vault.getAbstractFileByPath(entry.currentPath);
  const moves = getAttachmentMoveSettings(settings);
  if (moves.moveWithNote && source instanceof TFile) {
    attachments = buildAttachmentMovePlans(
      app,
      source,
      entry.currentPath,
      newPath,
      { skipSharedAttachments: moves.skipSharedAttachments }
    ).length;
  }
  return {
    conflict,
    attachments,
    newFolder: !isRoot && !(folder instanceof TFolder),
  };
}
