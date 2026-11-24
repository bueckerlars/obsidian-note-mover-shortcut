import { describe, expect, it } from 'vitest';
import type { PreviewEntry } from '../../types/MovePreview';
import {
  checkState,
  groupMoves,
  groupStays,
  matchesQuery,
  noteName,
  stayCategory,
} from './previewGroups';

const entry = (over: Partial<PreviewEntry>): PreviewEntry => ({
  fileName: 'A.md',
  currentPath: 'Inbox/A.md',
  targetPath: 'Archive',
  willBeMoved: true,
  matchedRule: 'Archive rule',
  tags: [],
  ...over,
});

describe('previewGroups', () => {
  it('groups moves by rule and destination in first-seen order', () => {
    const groups = groupMoves([
      entry({ fileName: 'A.md' }),
      entry({ fileName: 'B.md', targetPath: 'Other' }),
      entry({ fileName: 'C.md' }),
    ]);
    expect(groups.map(g => [g.destination, g.entries.length])).toEqual([
      ['Archive', 2],
      ['Other', 1],
    ]);
  });

  it('sorts stays into reasons', () => {
    const no = entry({
      willBeMoved: false,
      matchedRule: undefined,
      blockReason: 'No matching rule found',
    });
    const there = entry({
      willBeMoved: false,
      blockReason: 'File is already in the correct folder',
    });
    const excluded = entry({
      willBeMoved: false,
      matchedRule: undefined,
      blockReason: 'Blocked by blacklist filter',
    });
    const other = entry({
      willBeMoved: false,
      blockReason: 'Error: boom',
      matchedRule: undefined,
    });
    expect([no, there, excluded, other].map(stayCategory)).toEqual([
      'no_rule',
      'already_there',
      'excluded',
      'other',
    ]);
    expect(groupStays([there, no]).map(g => g.category)).toEqual([
      'no_rule',
      'already_there',
    ]);
  });

  it('searches name, folder and destination', () => {
    const item = entry({ fileName: 'Kickoff.md', targetPath: 'Projects' });
    expect(matchesQuery(item, 'kick')).toBe(true);
    expect(matchesQuery(item, 'inbox')).toBe(true);
    expect(matchesQuery(item, 'projects')).toBe(true);
    expect(matchesQuery(item, 'zzz')).toBe(false);
    expect(matchesQuery(item, '  ')).toBe(true);
  });

  it('reports the group checkbox state', () => {
    expect(checkState(0, 2)).toBe('unchecked');
    expect(checkState(1, 2)).toBe('mixed');
    expect(checkState(2, 2)).toBe('checked');
  });

  it('drops the markdown extension from a note name', () => {
    expect(noteName('Meeting.md')).toBe('Meeting');
    expect(noteName('Board.canvas')).toBe('Board.canvas');
  });
});
