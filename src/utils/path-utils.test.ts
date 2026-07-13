import { describe, it, expect, vi } from 'vitest';
import type { App } from 'obsidian';
import {
  folderExists,
  normalizeDestinationFolderPath,
  sanitizePathSegment,
} from './PathUtils';

function makeApp(existsImpl: (path: string) => Promise<boolean>): App {
  return {
    vault: {
      adapter: {
        exists: existsImpl,
      },
    },
  } as unknown as App;
}

describe('folderExists', () => {
  it('treats root and empty paths as existing', async () => {
    const exists = vi.fn().mockResolvedValue(false);
    const app = makeApp(exists);

    expect(await folderExists(app, '')).toBe(true);
    expect(await folderExists(app, '/')).toBe(true);
    expect(exists).not.toHaveBeenCalled();
  });

  it('checks formatted vault-relative paths via adapter.exists', async () => {
    const exists = vi
      .fn()
      .mockImplementation(async (path: string) => path === 'Projects/Notes');
    const app = makeApp(exists);

    expect(await folderExists(app, '/Projects/Notes/')).toBe(true);
    expect(await folderExists(app, 'Projects/Missing')).toBe(false);
    expect(exists).toHaveBeenCalledWith('Projects/Notes');
  });

  it('returns false when adapter.exists throws', async () => {
    const exists = vi.fn().mockRejectedValue(new Error('IO error'));
    const app = makeApp(exists);

    expect(await folderExists(app, 'Projects')).toBe(false);
  });
});

describe('sanitizePathSegment', () => {
  it('unwraps wikilinks and strips invalid characters', () => {
    expect(sanitizePathSegment('[[Client A]]')).toBe('Client A');
    expect(sanitizePathSegment('[[Alias|Target]]')).toBe('Alias');
    expect(sanitizePathSegment('a:b')).toBe('ab');
  });

  it('returns empty when nothing usable remains', () => {
    expect(sanitizePathSegment(':::')).toBe('');
  });
});

describe('normalizeDestinationFolderPath', () => {
  it('accepts simple safe paths', () => {
    expect(normalizeDestinationFolderPath('Projects/Notes')).toEqual({
      ok: true,
      path: 'Projects/Notes',
    });
  });

  it('rejects empty segments from double slashes (unresolved placeholder)', () => {
    const r = normalizeDestinationFolderPath('Projects//Notes');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain('empty path segment');
    }
  });

  it('rejects dot segments', () => {
    const r = normalizeDestinationFolderPath('Projects/../Escape');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain('. or ..');
    }
  });

  it('rejects when a segment sanitizes to empty', () => {
    const r = normalizeDestinationFolderPath('Projects/<>:/more');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain('empty after sanitization');
    }
  });

  it('trims outer slashes without dropping empty middle segments', () => {
    const r = normalizeDestinationFolderPath('/A//B/');
    expect(r.ok).toBe(false);
  });
});
