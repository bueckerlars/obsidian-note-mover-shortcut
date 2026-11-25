import { describe, expect, it } from 'vitest';
import type { ChangelogEntry } from '../../generated/changelog';
import { plainText, releaseNotes, shortVersion } from './releaseNotes';

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

  it('falls back to the changelog bullets when an entry has no user-facing notes', () => {
    const notes = releaseNotes([
      {
        version: '1.4.1',
        changes: {
          fixes: ['**Plugin review**: Clears `warnings`.'],
          improvements: ['**Lint**: Fails on [warnings](https://x.y).'],
        },
      },
    ]);
    expect(notes.highlights).toEqual([]);
    expect(notes.fixes).toEqual([
      'Lint: Fails on warnings.',
      'Plugin review: Clears warnings.',
    ]);
  });

  it('keeps the user-facing notes and ignores the bullets when they exist', () => {
    const notes = releaseNotes([
      { version: '1.4.0', fixes: ['one'], changes: { fixes: ['detail'] } },
    ]);
    expect(notes.fixes).toEqual(['one']);
  });

  it('removes markdown from a bullet', () => {
    expect(plainText('**A**: b `c` [d](e)')).toBe('A: b c d');
  });

  it('shortens versions', () => {
    expect(shortVersion('1.5.2')).toBe('1.5');
  });
});
