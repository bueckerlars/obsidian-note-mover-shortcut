import { describe, it, expect } from 'vitest';
import { parseListProperty } from './parseListProperty';

describe('parseListProperty', () => {
  it('returns empty for null/undefined', () => {
    expect(parseListProperty(null)).toEqual([]);
    expect(parseListProperty(undefined)).toEqual([]);
  });

  it('maps array of mixed types', () => {
    expect(parseListProperty([' a ', 2, 'b'])).toEqual(['a', '2', 'b']);
  });

  it('splits comma and newline strings', () => {
    expect(parseListProperty('a,b\nc')).toEqual(['a', 'b', 'c']);
  });
});
