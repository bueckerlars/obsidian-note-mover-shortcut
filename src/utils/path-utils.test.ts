import { describe, it, expect } from 'vitest';
import {
  normalizeDestinationFolderPath,
  sanitizePathSegment,
} from './PathUtils';

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
