import { describe, expect, it } from 'vitest';
import { buildRenamedFileName } from './note-move-conflict';

describe('buildRenamedFileName', () => {
  it('appends a numeric suffix before the extension', () => {
    expect(buildRenamedFileName('note', 'md', 1)).toBe('note (1).md');
    expect(buildRenamedFileName('note', 'md', 2)).toBe('note (2).md');
  });

  it('handles files without an extension', () => {
    expect(buildRenamedFileName('README', '', 1)).toBe('README (1)');
  });
});
