import { describe, it, expect } from 'vitest';
import {
  formatDateComponent,
  isDatePlaceholderComponent,
  parsePropertyDateValue,
} from './property-date';

describe('property-date', () => {
  it('recognizes date placeholder components', () => {
    expect(isDatePlaceholderComponent('year')).toBe(true);
    expect(isDatePlaceholderComponent('monthName')).toBe(true);
    expect(isDatePlaceholderComponent('foo')).toBe(false);
  });

  it('parses ISO date strings without timezone drift', () => {
    const parsed = parsePropertyDateValue('2025-06-13');
    expect(parsed).toEqual({ year: 2025, month: 6, day: 13 });
  });

  it('parses ISO datetime strings using the date portion only', () => {
    const parsed = parsePropertyDateValue('2025-06-13T15:30:00');
    expect(parsed).toEqual({ year: 2025, month: 6, day: 13 });
  });

  it('parses numeric timestamps', () => {
    const parsed = parsePropertyDateValue(Date.UTC(2025, 5, 13));
    expect(parsed).not.toBeNull();
  });

  it('returns null for invalid values', () => {
    expect(parsePropertyDateValue('')).toBeNull();
    expect(parsePropertyDateValue('not-a-date')).toBeNull();
    expect(parsePropertyDateValue('2025-13-40')).toBeNull();
  });

  it('formats all date components', () => {
    const date = { year: 2025, month: 6, day: 13 };

    expect(formatDateComponent(date, 'year')).toBe('2025');
    expect(formatDateComponent(date, 'month')).toBe('06');
    expect(formatDateComponent(date, 'day')).toBe('13');
    expect(formatDateComponent(date, 'iso')).toBe('2025-06-13');
    expect(formatDateComponent(date, 'monthName')).toBe('June');
    expect(formatDateComponent(date, 'dayOfWeek')).toBe('friday');
  });
});
