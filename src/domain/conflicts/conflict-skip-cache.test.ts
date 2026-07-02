import { describe, expect, it } from 'vitest';
import {
  pruneConflictSkipEntries,
  removeConflictSkipEntriesForPath,
  removeConflictSkipEntriesForSource,
  removeConflictSkipEntry,
  rewriteConflictSkipPathsOnRename,
  shouldKeepConflictSkipEntry,
  upsertConflictSkipEntry,
} from './conflict-skip-cache';
import type { ConflictSkipCacheEntry } from '../../types/ConflictSkipCache';

const entry = (
  sourcePath: string,
  targetPath: string,
  skippedAt = 1
): ConflictSkipCacheEntry => ({
  sourcePath,
  targetPath,
  skippedAt,
});

describe('shouldKeepConflictSkipEntry', () => {
  it('keeps entry when source and target both exist', async () => {
    const exists = async (path: string) =>
      path === 'inbox/note.md' || path === 'archive/note.md';
    expect(
      await shouldKeepConflictSkipEntry(
        entry('inbox/note.md', 'archive/note.md'),
        exists
      )
    ).toBe(true);
  });

  it('drops entry when source is missing', async () => {
    const exists = async (path: string) => path === 'archive/note.md';
    expect(
      await shouldKeepConflictSkipEntry(
        entry('inbox/note.md', 'archive/note.md'),
        exists
      )
    ).toBe(false);
  });

  it('drops entry when target conflict file is missing', async () => {
    const exists = async (path: string) => path === 'inbox/note.md';
    expect(
      await shouldKeepConflictSkipEntry(
        entry('inbox/note.md', 'archive/note.md'),
        exists
      )
    ).toBe(false);
  });
});

describe('pruneConflictSkipEntries', () => {
  it('removes stale entries', async () => {
    const entries = [
      entry('inbox/a.md', 'archive/a.md'),
      entry('inbox/b.md', 'archive/b.md'),
    ];
    const exists = async (path: string) =>
      path === 'inbox/a.md' || path === 'archive/a.md';
    const pruned = await pruneConflictSkipEntries(entries, exists);
    expect(pruned).toHaveLength(1);
    expect(pruned[0]?.sourcePath).toBe('inbox/a.md');
  });
});

describe('rewriteConflictSkipPathsOnRename', () => {
  it('updates source and target paths on rename', () => {
    const entries = [entry('inbox/note.md', 'archive/note.md')];
    const rewritten = rewriteConflictSkipPathsOnRename(
      entries,
      'inbox/note.md',
      'drafts/note.md'
    );
    expect(rewritten[0]?.sourcePath).toBe('drafts/note.md');
  });

  it('updates nested paths when a folder is renamed', () => {
    const entries = [entry('inbox/sub/note.md', 'archive/note.md')];
    const rewritten = rewriteConflictSkipPathsOnRename(
      entries,
      'inbox',
      'drafts'
    );
    expect(rewritten[0]?.sourcePath).toBe('drafts/sub/note.md');
  });
});

describe('removeConflictSkipEntriesForPath', () => {
  it('removes entries referencing deleted path', () => {
    const entries = [
      entry('inbox/a.md', 'archive/a.md'),
      entry('inbox/b.md', 'archive/b.md'),
    ];
    const next = removeConflictSkipEntriesForPath(entries, 'inbox/a.md');
    expect(next).toHaveLength(1);
    expect(next[0]?.sourcePath).toBe('inbox/b.md');
  });

  it('removes entries under a deleted folder prefix', () => {
    const entries = [entry('inbox/sub/note.md', 'archive/note.md')];
    const next = removeConflictSkipEntriesForPath(entries, 'inbox');
    expect(next).toHaveLength(0);
  });
});

describe('upsertConflictSkipEntry', () => {
  it('replaces an existing entry for the same source and target', () => {
    const entries = [entry('inbox/a.md', 'archive/a.md', 1)];
    const next = upsertConflictSkipEntry(
      entries,
      'inbox/a.md',
      'archive/a.md',
      99
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.skippedAt).toBe(99);
  });
});

describe('removeConflictSkipEntry', () => {
  it('removes a single matching entry', () => {
    const entries = [
      entry('inbox/a.md', 'archive/a.md'),
      entry('inbox/b.md', 'archive/b.md'),
    ];
    const next = removeConflictSkipEntry(entries, 'inbox/a.md', 'archive/a.md');
    expect(next).toHaveLength(1);
    expect(next[0]?.sourcePath).toBe('inbox/b.md');
  });
});

describe('removeConflictSkipEntriesForSource', () => {
  it('removes all entries for a source path', () => {
    const entries = [
      entry('inbox/a.md', 'archive/a.md'),
      entry('inbox/a.md', 'other/a.md'),
      entry('inbox/b.md', 'archive/b.md'),
    ];
    const next = removeConflictSkipEntriesForSource(entries, 'inbox/a.md');
    expect(next).toHaveLength(1);
    expect(next[0]?.sourcePath).toBe('inbox/b.md');
  });
});
