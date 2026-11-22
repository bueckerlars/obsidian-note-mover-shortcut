import { describe, expect, it } from 'vitest';
import { countWords, describeEdited } from './conflict-details';

describe('countWords', () => {
  it('counts whitespace separated words', () => {
    expect(countWords('  one two\nthree  ')).toBe(3);
    expect(countWords('')).toBe(0);
  });
});

describe('describeEdited', () => {
  const now = new Date(2026, 10, 22, 23, 40).getTime();
  it('shows the time for today', () => {
    expect(describeEdited(new Date(2026, 10, 22, 9, 5).getTime(), now)).toEqual(
      { kind: 'today', time: '09:05' }
    );
  });
  it('shows the date, with the year when it is not this year', () => {
    expect(describeEdited(new Date(2026, 10, 3).getTime(), now)).toEqual({
      kind: 'date',
      date: '3 Nov',
    });
    expect(describeEdited(new Date(2025, 10, 3).getTime(), now)).toEqual({
      kind: 'date',
      date: '3 Nov 2025',
    });
  });
});
