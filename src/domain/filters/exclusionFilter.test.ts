import { describe, expect, it } from 'vitest';
import {
  replaceExclusion,
  countValues,
  formatExclusion,
  parseExclusion,
  rankSuggestions,
} from './exclusionFilter';

describe('exclusion filters', () => {
  it('parses stored strings, with or without a space', () => {
    expect(parseExclusion('tag:#draft')).toEqual({
      kind: 'tag',
      value: '#draft',
    });
    expect(parseExclusion('tag: #draft')).toEqual({
      kind: 'tag',
      value: '#draft',
    });
    expect(parseExclusion('path:Templates/')).toEqual({
      kind: 'folder',
      value: 'Templates/',
    });
    expect(parseExclusion('fileName:README')).toEqual({
      kind: 'fileName',
      value: 'README',
    });
    expect(parseExclusion('property:status: done')).toEqual({
      kind: 'property',
      value: 'status: done',
    });
    expect(parseExclusion('content:x')).toEqual({
      kind: 'other',
      value: 'content:x',
    });
    expect(parseExclusion('')).toEqual({ kind: 'other', value: '' });
  });

  it('formats and round-trips', () => {
    expect(formatExclusion('folder', ' Templates ')).toBe('path:Templates');
    expect(formatExclusion('tag', '  ')).toBeNull();
    const stored = formatExclusion('property', 'a: b') as string;
    expect(parseExclusion(stored)).toEqual({ kind: 'property', value: 'a: b' });
  });

  it('counts per note and ranks by count', () => {
    const counts = countValues([['#a', '#a', '#b'], ['#a'], ['#ab']]);
    expect(counts.get('#a')).toBe(2);
    expect(rankSuggestions(counts, 'a').map(s => s.value)).toEqual([
      '#a',
      '#ab',
    ]);
    expect(rankSuggestions(counts, '#b')).toEqual([{ value: '#b', count: 1 }]);
  });

  it('replaces a filter in place and drops the edited one when the value is already listed', () => {
    const list = [{ value: 'tag:a' }, { value: 'path:b' }, { value: 'tag:c' }];
    expect(replaceExclusion(list, 1, 'fileName:x')).toEqual([
      { value: 'tag:a' },
      { value: 'fileName:x' },
      { value: 'tag:c' },
    ]);
    expect(replaceExclusion(list, 1, 'tag:c')).toEqual([
      { value: 'tag:a' },
      { value: 'tag:c' },
    ]);
    expect(replaceExclusion(list, 1, 'path:b')).toEqual(list);
  });
});
