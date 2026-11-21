export interface BulkMoveFile {
  path: string;
}

export interface BulkMovePrompt {
  count: number;
  paths: string[];
  undoHint: string;
}

const PREVIEW_PATH_LIMIT = 10;

export function bulkMovePrompt(
  files: readonly BulkMoveFile[],
  undoHint: string
): BulkMovePrompt {
  return {
    count: files.length,
    paths: files.slice(0, PREVIEW_PATH_LIMIT).map(file => file.path),
    undoHint,
  };
}

/**
 * Renames the previewed files only after `confirm` accepts.
 * A declined confirm never calls `renameFile`.
 */
export async function runConfirmedBulkMove(options: {
  previewed: readonly BulkMoveFile[];
  undoHint: string;
  confirm: (prompt: BulkMovePrompt) => Promise<boolean> | boolean;
  renameFile: (file: BulkMoveFile) => Promise<void>;
}): Promise<void> {
  if (options.previewed.length === 0) {
    return;
  }
  const accepted = await options.confirm(
    bulkMovePrompt(options.previewed, options.undoHint)
  );
  if (!accepted) {
    return;
  }
  for (const file of options.previewed) {
    await options.renameFile(file);
  }
}
