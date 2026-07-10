export interface ConflictSkipCacheEntry {
  /** Vault-relative path of the note when the conflict was skipped. */
  sourcePath: string;
  /** Intended full destination path (folder + file name). */
  targetPath: string;
  /** Unix timestamp when the skip was recorded. */
  skippedAt: number;
}

export interface ConflictSkipCacheData {
  entries: ConflictSkipCacheEntry[];
}
