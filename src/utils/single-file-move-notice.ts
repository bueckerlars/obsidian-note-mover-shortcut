import type { TFile } from 'obsidian';
import { NoticeManager } from './NoticeManager';

/** Vault-relative folder path for display in move toasts. */
export function formatDestinationFolderForNotice(targetFolder: string): string {
  const normalized = targetFolder
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .trim();
  if (!normalized || normalized === '/') {
    return '/';
  }
  return normalized;
}

export function formatSingleFileMoveMessage(
  displayName: string,
  targetFolder: string
): string {
  return `"${displayName}" moved to ${formatDestinationFolderForNotice(targetFolder)}`;
}

/**
 * Toast for a single note move (manual command, ribbon, or on-edit).
 */
export function showSingleFileMoveNotice(
  file: TFile,
  targetFolder: string
): void {
  NoticeManager.success(
    formatSingleFileMoveMessage(file.basename, targetFolder)
  );
}
