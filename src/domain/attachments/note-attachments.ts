import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { isMovableVaultFile } from '../vault/movable-vault-files';
import { combinePath, getParentPath } from '../../utils/PathUtils';

export interface AttachmentRef {
  path: string;
  file: TFile;
}

function hasUnsafePathSegments(path: string): boolean {
  return path.split('/').some(seg => seg === '..' || seg === '.');
}

export interface AttachmentMovePlan {
  file: TFile;
  sourcePath: string;
  destinationPath: string;
}

/**
 * Returns true when attachmentPath lives in the note's folder or a subfolder.
 * Root-level notes only co-move attachments in the vault root (no slashes).
 */
export function isAttachmentUnderNoteFolder(
  attachmentPath: string,
  noteFolder: string
): boolean {
  if (hasUnsafePathSegments(attachmentPath)) {
    return false;
  }
  if (!noteFolder) {
    return !attachmentPath.includes('/');
  }
  return (
    attachmentPath === noteFolder || attachmentPath.startsWith(`${noteFolder}/`)
  );
}

/**
 * Computes the destination path for an attachment after its parent note moves,
 * preserving the path relative to the note folder.
 */
export function computeCoMovedAttachmentPath(
  oldNotePath: string,
  newNotePath: string,
  attachmentPath: string
): string | null {
  const oldNoteFolder = getParentPath(oldNotePath);
  const newNoteFolder = getParentPath(newNotePath);

  if (!isAttachmentUnderNoteFolder(attachmentPath, oldNoteFolder)) {
    return null;
  }

  const relative = oldNoteFolder
    ? attachmentPath.slice(oldNoteFolder.length + 1)
    : attachmentPath;

  return combinePath(newNoteFolder, relative);
}

/**
 * True when any note other than excludeNotePath links to attachmentPath.
 */
export function isSharedAttachment(
  resolvedLinks: Record<string, Record<string, number>>,
  attachmentPath: string,
  excludeNotePath: string
): boolean {
  for (const [sourcePath, dests] of Object.entries(resolvedLinks)) {
    if (sourcePath === excludeNotePath) {
      continue;
    }
    if (dests[attachmentPath]) {
      return true;
    }
  }
  return false;
}

/**
 * Collects vault attachment files referenced by links/embeds in a markdown note.
 */
export function collectNoteAttachments(app: App, note: TFile): AttachmentRef[] {
  if (note.extension !== 'md') {
    return [];
  }

  const fileCache = app.metadataCache.getFileCache(note);
  if (!fileCache) {
    return [];
  }

  const linkPaths = new Set<string>();
  for (const link of fileCache.links ?? []) {
    if (link.link && typeof link.link === 'string') {
      linkPaths.add(link.link);
    }
  }
  for (const embed of fileCache.embeds ?? []) {
    if (embed.link && typeof embed.link === 'string') {
      linkPaths.add(embed.link);
    }
  }

  const noteFolder = getParentPath(note.path);
  const seen = new Set<string>();
  const result: AttachmentRef[] = [];

  for (const linkPath of linkPaths) {
    const resolved = app.metadataCache.getFirstLinkpathDest(
      linkPath,
      note.path
    );
    if (!resolved || !(resolved instanceof TFile)) {
      continue;
    }
    if (isMovableVaultFile(resolved)) {
      continue;
    }
    if (!isAttachmentUnderNoteFolder(resolved.path, noteFolder)) {
      continue;
    }
    if (seen.has(resolved.path)) {
      continue;
    }
    seen.add(resolved.path);
    result.push({ path: resolved.path, file: resolved });
  }

  return result;
}

/**
 * Builds move plans for attachments that should co-move with a note.
 */
export function buildAttachmentMovePlans(
  app: App,
  note: TFile,
  oldNotePath: string,
  newNotePath: string,
  options: { skipSharedAttachments: boolean }
): AttachmentMovePlan[] {
  const attachments = collectNoteAttachments(app, note);
  const plans: AttachmentMovePlan[] = [];

  for (const { file, path } of attachments) {
    if (
      options.skipSharedAttachments &&
      isSharedAttachment(app.metadataCache.resolvedLinks, path, oldNotePath)
    ) {
      continue;
    }

    const destinationPath = computeCoMovedAttachmentPath(
      oldNotePath,
      newNotePath,
      path
    );
    if (!destinationPath || destinationPath === path) {
      continue;
    }

    plans.push({ file, sourcePath: path, destinationPath });
  }

  return plans;
}
