import { describe, expect, it } from 'vitest';
import type { ChangelogEntry } from '../../generated/changelog';
import { releaseNotes, shortVersion } from './releaseNotes';

const highlight = (title: string) => ({ icon: 'eye', title, text: title });

describe('releaseNotes', () => {
  it('keeps three highlights and every fix, newest entry first', () => {
    const entries: ChangelogEntry[] = [
      {
        version: '1.5.0',
        highlights: [highlight('a'), highlight('b')],
        fixes: ['one'],
        changes: { fixes: ['developer detail'] },
      },
      {
        version: '1.4.1',
        highlights: [highlight('c'), highlight('d')],
        fixes: ['two'],
        changes: {},
      },
    ];
    const notes = releaseNotes(entries);
    expect(notes.highlights.map(h => h.title)).toEqual(['a', 'b', 'c']);
    expect(notes.fixes).toEqual(['one', 'two']);
  });

  it('is empty for entries without user-facing notes', () => {
    expect(releaseNotes([{ version: '1.4.0', changes: {} }])).toEqual({
      highlights: [],
      fixes: [],
    });
  });

  it('shortens versions', () => {
    expect(shortVersion('1.5.2')).toBe('1.5');
  });
});
