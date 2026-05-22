import type { App } from 'obsidian';

export interface AttachmentSourceMove {
  sourcePath: string;
  destinationPath: string;
}

/** Sort folder paths deepest-first so nested empty folders are removed before parents. */
export function sortFoldersByDepthDesc(folderPaths: string[]): string[] {
  return [...folderPaths].sort((a, b) => {
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    if (depthB !== depthA) {
      return depthB - depthA;
    }
    return b.localeCompare(a);
  });
}

/** Unique parent directories of moved attachment source paths. */
export function collectSourceFoldersFromMoves(
  moves: AttachmentSourceMove[]
): string[] {
  const folders = new Set<string>();
  for (const move of moves) {
    const lastSlash = move.sourcePath.lastIndexOf('/');
    if (lastSlash > 0) {
      folders.add(move.sourcePath.substring(0, lastSlash));
    }
  }
  return sortFoldersByDepthDesc([...folders]);
}

export async function isVaultFolderEmpty(
  app: App,
  folderPath: string
): Promise<boolean> {
  if (!folderPath) {
    return false;
  }
  const exists = await app.vault.adapter.exists(folderPath);
  if (!exists) {
    return false;
  }
  const listing = await app.vault.adapter.list(folderPath);
  return listing.files.length === 0 && listing.folders.length === 0;
}

/**
 * Deletes vault folders that are empty after attachment co-move.
 * Only considers folders that previously held moved attachments (deepest first).
 */
export async function deleteEmptyAssetFoldersAfterMove(
  app: App,
  moves: AttachmentSourceMove[]
): Promise<string[]> {
  if (moves.length === 0) {
    return [];
  }

  const deleted: string[] = [];
  const candidates = collectSourceFoldersFromMoves(moves);

  for (const folderPath of candidates) {
    if (!(await isVaultFolderEmpty(app, folderPath))) {
      continue;
    }

    try {
      await app.vault.adapter.rmdir(folderPath, false);
      deleted.push(folderPath);
    } catch (error) {
      console.warn(
        `[Advanced Note Mover] Could not delete empty folder ${folderPath}:`,
        error
      );
    }
  }

  return deleted;
}
