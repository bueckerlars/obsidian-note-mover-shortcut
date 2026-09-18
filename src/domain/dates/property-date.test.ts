import { describe, it, expect } from 'vitest';
import {
  buildDatePlaceholderSuggestions,
  formatDateComponent,
  formatDatePattern,
  isDateFormatPattern,
  isDatePlaceholderComponent,
  parsePropertyDateValue,
} from './property-date';

describe('property-date', () => {
  it('recognizes date placeholder components', () => {
    expect(isDatePlaceholderComponent('year')).toBe(true);
    expect(isDatePlaceholderComponent('monthName')).toBe(true);
    expect(isDatePlaceholderComponent('MMM')).toBe(true);
    expect(isDatePlaceholderComponent('foo')).toBe(false);
  });

  it('recognizes moment-style date format patterns', () => {
    expect(isDateFormatPattern('MMM')).toBe(true);
    expect(isDateFormatPattern('MM')).toBe(true);
    expect(isDateFormatPattern('DD')).toBe(true);
    expect(isDateFormatPattern('YYYY-MM-DD')).toBe(true);
    expect(isDateFormatPattern('DD-MM-YYYY')).toBe(true);
    expect(isDateFormatPattern('YYYY.MM.DD')).toBe(true);
    expect(isDateFormatPattern('YYYY/MM/DD')).toBe(true);
    expect(isDateFormatPattern('D-M-YYYY')).toBe(true);
    expect(isDateFormatPattern('name')).toBe(false);
    expect(isDateFormatPattern('year')).toBe(false);
    expect(isDateFormatPattern('YYYY-QQ')).toBe(false);
    expect(isDateFormatPattern('')).toBe(false);
    expect(isDateFormatPattern('D')).toBe(false);
    expect(isDateFormatPattern('M')).toBe(false);
  });

  it('builds date placeholder suggestions with the typed separator', () => {
    const dotted = buildDatePlaceholderSuggestions('created', '', '.');
    expect(dotted).toContain('{{property.created.MMM}}');
    expect(dotted).toContain('{{property.created.YYYY-MM-DD}}');
    expect(dotted).toContain('{{property.created.DD-MM-YYYY}}');
    expect(dotted).toContain('{{property.created.YYYY/MM/DD}}');
    expect(dotted).toContain('{{property.created:YYYY.MM.DD}}');
    expect(
      dotted.filter(value => value === '{{property.created.MMM}}')
    ).toHaveLength(1);

    const colon = buildDatePlaceholderSuggestions('created', 'yyyy', ':');
    expect(colon).toContain('{{property.created:YYYY-MM-DD}}');
    expect(colon).toContain('{{property.created:YYYY/MM/DD}}');
    expect(colon).toContain('{{property.created:YYYY.MM.DD}}');
    expect(colon).not.toContain('{{property.created.YYYY-MM-DD}}');

    const slashSearch = buildDatePlaceholderSuggestions(
      'created',
      'yyyy/',
      '.'
    );
    expect(slashSearch).toEqual(['{{property.created.YYYY/MM/DD}}']);
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
    expect(formatDateComponent(date, 'MMM')).toBe('Jun');
    expect(formatDateComponent(date, 'dayOfWeek')).toBe('friday');
  });

  it('formats moment-style date patterns', () => {
    const june = { year: 2025, month: 6, day: 13 };
    const september = { year: 2025, month: 9, day: 18 };

    expect(formatDatePattern(june, 'MMM')).toBe('Jun');
    expect(formatDatePattern(june, 'YYYY-MM-DD')).toBe('2025-06-13');
    expect(formatDatePattern(june, 'DD-MM-YYYY')).toBe('13-06-2025');
    expect(formatDatePattern(june, 'YYYY.MM.DD')).toBe('2025.06.13');
    expect(formatDatePattern(september, 'MMMM')).toBe('September');
    expect(formatDatePattern(september, 'MMM')).toBe('Sep');
    expect(formatDatePattern(june, 'dddd')).toBe('Friday');
    expect(formatDatePattern(june, 'ddd')).toBe('Fri');
    expect(formatDatePattern(june, 'YY/M/D')).toBe('25/6/13');
  });
});
