import type { ConflictSkipCacheEntry } from '../../types/ConflictSkipCache';
import { formatPath } from '../../utils/PathUtils';

/** Normalizes vault-relative paths for stable cache keys. */
export function normalizeConflictCachePath(path: string): string {
  return formatPath(path.trim());
}

export function conflictSkipCacheKey(
  sourcePath: string,
  targetPath: string
): string {
  return `${normalizeConflictCachePath(sourcePath)}\0${normalizeConflictCachePath(targetPath)}`;
}

export function isValidConflictSkipEntry(
  entry: unknown
): entry is ConflictSkipCacheEntry {
  if (!entry || typeof entry !== 'object') {
    return false;
  }
  const e = entry as ConflictSkipCacheEntry;
  return (
    typeof e.sourcePath === 'string' &&
    e.sourcePath.trim() !== '' &&
    typeof e.targetPath === 'string' &&
    e.targetPath.trim() !== '' &&
    typeof e.skippedAt === 'number'
  );
}

/** Returns true when the entry should remain in the cache. */
export async function shouldKeepConflictSkipEntry(
  entry: ConflictSkipCacheEntry,
  exists: (path: string) => Promise<boolean>
): Promise<boolean> {
  const sourcePath = normalizeConflictCachePath(entry.sourcePath);
  const sourceExists = await exists(sourcePath);
  if (!sourceExists) {
    return false;
  }
  const targetPath = normalizeConflictCachePath(entry.targetPath);
  const targetExists = await exists(targetPath);
  if (!targetExists) {
    return false;
  }
  return true;
}

export async function pruneConflictSkipEntries(
  entries: ConflictSkipCacheEntry[],
  exists: (path: string) => Promise<boolean>
): Promise<ConflictSkipCacheEntry[]> {
  const kept: ConflictSkipCacheEntry[] = [];
  for (const entry of entries) {
    if (!isValidConflictSkipEntry(entry)) {
      continue;
    }
    if (await shouldKeepConflictSkipEntry(entry, exists)) {
      kept.push(entry);
    }
  }
  return kept;
}

/** Rewrites paths in entries after a vault rename. */
export function rewriteConflictSkipPathsOnRename(
  entries: ConflictSkipCacheEntry[],
  oldPath: string,
  newPath: string
): ConflictSkipCacheEntry[] {
  return entries.map(entry => ({
    ...entry,
    sourcePath:
      entry.sourcePath === oldPath
        ? newPath
        : rewritePathPrefix(entry.sourcePath, oldPath, newPath),
    targetPath:
      entry.targetPath === oldPath
        ? newPath
        : rewritePathPrefix(entry.targetPath, oldPath, newPath),
  }));
}

function rewritePathPrefix(
  path: string,
  oldPrefix: string,
  newPrefix: string
): string {
  if (path === oldPrefix) {
    return newPrefix;
  }
  const prefix = `${oldPrefix}/`;
  if (path.startsWith(prefix)) {
    return `${newPrefix}/${path.slice(prefix.length)}`;
  }
  return path;
}

/** Removes entries that reference a deleted path as source or target. */
export function removeConflictSkipEntriesForPath(
  entries: ConflictSkipCacheEntry[],
  deletedPath: string
): ConflictSkipCacheEntry[] {
  return entries.filter(
    entry =>
      entry.sourcePath !== deletedPath &&
      entry.targetPath !== deletedPath &&
      !entry.sourcePath.startsWith(`${deletedPath}/`) &&
      !entry.targetPath.startsWith(`${deletedPath}/`)
  );
}

export function findConflictSkipEntry(
  entries: ConflictSkipCacheEntry[],
  sourcePath: string,
  targetPath: string
): ConflictSkipCacheEntry | undefined {
  const key = conflictSkipCacheKey(sourcePath, targetPath);
  return entries.find(
    entry => conflictSkipCacheKey(entry.sourcePath, entry.targetPath) === key
  );
}

/** Finds any skip entry for the same source note (normalized path). */
export function findConflictSkipEntryForSource(
  entries: ConflictSkipCacheEntry[],
  sourcePath: string
): ConflictSkipCacheEntry | undefined {
  const normalizedSource = normalizeConflictCachePath(sourcePath);
  return entries.find(
    entry => normalizeConflictCachePath(entry.sourcePath) === normalizedSource
  );
}

export function upsertConflictSkipEntry(
  entries: ConflictSkipCacheEntry[],
  sourcePath: string,
  targetPath: string,
  skippedAt: number
): ConflictSkipCacheEntry[] {
  const normalizedSource = normalizeConflictCachePath(sourcePath);
  const normalizedTarget = normalizeConflictCachePath(targetPath);
  const key = conflictSkipCacheKey(normalizedSource, normalizedTarget);
  const without = entries.filter(
    entry => conflictSkipCacheKey(entry.sourcePath, entry.targetPath) !== key
  );
  return [
    ...without,
    {
      sourcePath: normalizedSource,
      targetPath: normalizedTarget,
      skippedAt,
    },
  ];
}

export function removeConflictSkipEntriesForSource(
  entries: ConflictSkipCacheEntry[],
  sourcePath: string
): ConflictSkipCacheEntry[] {
  return entries.filter(entry => entry.sourcePath !== sourcePath);
}

export function removeConflictSkipEntry(
  entries: ConflictSkipCacheEntry[],
  sourcePath: string,
  targetPath: string
): ConflictSkipCacheEntry[] {
  const key = conflictSkipCacheKey(sourcePath, targetPath);
  return entries.filter(
    entry => conflictSkipCacheKey(entry.sourcePath, entry.targetPath) !== key
  );
}
