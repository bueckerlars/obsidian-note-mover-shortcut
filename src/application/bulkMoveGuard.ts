export interface BulkMoveFile {
  path: string;
  /** Note name shown in the confirmation, without extension. */
  name: string;
  destination: string;
  rule?: string;
}

export interface BulkMovePrompt {
  count: number;
  ruleCount: number;
  rows: { name: string; destination: string }[];
  /** Notes beyond the listed rows. */
  more: number;
}

export const BULK_PROMPT_ROW_LIMIT = 5;

export function bulkMovePrompt(files: readonly BulkMoveFile[]): BulkMovePrompt {
  const rules = new Set(files.map(file => file.rule ?? ''));
  return {
    count: files.length,
    ruleCount: rules.size,
    rows: files
      .slice(0, BULK_PROMPT_ROW_LIMIT)
      .map(file => ({ name: file.name, destination: file.destination })),
    more: Math.max(0, files.length - BULK_PROMPT_ROW_LIMIT),
  };
}

/**
 * Renames the previewed files only after `confirm` accepts.
 * A declined confirm never calls `renameFile`.
 */
export async function runConfirmedBulkMove(options: {
  previewed: readonly BulkMoveFile[];
  confirm: (prompt: BulkMovePrompt) => Promise<boolean> | boolean;
  renameFile: (file: BulkMoveFile) => Promise<void>;
}): Promise<void> {
  if (options.previewed.length === 0) {
    return;
  }
  const accepted = await options.confirm(bulkMovePrompt(options.previewed));
  if (!accepted) {
    return;
  }
  for (const file of options.previewed) {
    await options.renameFile(file);
  }
}
