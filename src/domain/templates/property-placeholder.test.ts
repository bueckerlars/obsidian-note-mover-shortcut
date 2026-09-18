import { describe, it, expect } from 'vitest';
import {
  parsePropertyPlaceholderKey,
  resolvePropertyPlaceholder,
} from './property-placeholder';

describe('property-placeholder', () => {
  it('parses date component suffixes', () => {
    expect(parsePropertyPlaceholderKey('created.year')).toEqual({
      lookupKey: 'created',
      dateComponent: 'year',
    });
    expect(parsePropertyPlaceholderKey('status')).toEqual({
      lookupKey: 'status',
    });
    expect(parsePropertyPlaceholderKey('client.name')).toEqual({
      lookupKey: 'client.name',
    });
    expect(parsePropertyPlaceholderKey('created.MMM')).toEqual({
      lookupKey: 'created',
      dateComponent: 'MMM',
    });
    expect(parsePropertyPlaceholderKey('created.YYYY-MM-DD')).toEqual({
      lookupKey: 'created',
      dateFormat: 'YYYY-MM-DD',
    });
    expect(parsePropertyPlaceholderKey('created.DD-MM-YYYY')).toEqual({
      lookupKey: 'created',
      dateFormat: 'DD-MM-YYYY',
    });
    expect(parsePropertyPlaceholderKey('created:YYYY.MM.DD')).toEqual({
      lookupKey: 'created',
      dateFormat: 'YYYY.MM.DD',
    });
    expect(parsePropertyPlaceholderKey('created:DD-MM-YYYY')).toEqual({
      lookupKey: 'created',
      dateFormat: 'DD-MM-YYYY',
    });
    expect(parsePropertyPlaceholderKey('created: YYYY-MM-DD')).toEqual({
      lookupKey: 'created',
      dateFormat: 'YYYY-MM-DD',
    });
    expect(parsePropertyPlaceholderKey('due:date.year')).toEqual({
      lookupKey: 'due:date',
      dateComponent: 'year',
    });
    expect(parsePropertyPlaceholderKey('priority.D')).toEqual({
      lookupKey: 'priority.D',
    });
  });

  it('resolves date components from base properties', () => {
    const properties = { created: '2025-06-13' };
    expect(resolvePropertyPlaceholder('created.year', properties)).toBe('2025');
    expect(resolvePropertyPlaceholder('created.month', properties)).toBe('06');
    expect(resolvePropertyPlaceholder('created.monthName', properties)).toBe(
      'June'
    );
    expect(resolvePropertyPlaceholder('created.MMM', properties)).toBe('Jun');
    expect(resolvePropertyPlaceholder('created.YYYY-MM-DD', properties)).toBe(
      '2025-06-13'
    );
    expect(resolvePropertyPlaceholder('created.DD-MM-YYYY', properties)).toBe(
      '13-06-2025'
    );
    expect(resolvePropertyPlaceholder('created:YYYY.MM.DD', properties)).toBe(
      '2025.06.13'
    );
    expect(resolvePropertyPlaceholder('created: YYYY-MM-DD', properties)).toBe(
      '2025-06-13'
    );
  });

  it('does not treat single-letter suffixes as date formats', () => {
    expect(resolvePropertyPlaceholder('priority.D', { priority: 3 })).toBe('');
    expect(
      resolvePropertyPlaceholder('priority.D', { 'priority.D': 'literal' })
    ).toBe('literal');
    expect(resolvePropertyPlaceholder('priority.M', { priority: 3 })).toBe('');
  });

  it('does not treat nested non-date keys as format patterns', () => {
    expect(resolvePropertyPlaceholder('client.name', { client: 'Acme' })).toBe(
      ''
    );
    expect(
      resolvePropertyPlaceholder('client.name', {
        'client.name': 'Acme Corp',
      })
    ).toBe('Acme Corp');
  });

  it('prefers literal property keys over date components', () => {
    const properties = {
      'created.year': 'manual',
      created: '2025-06-13',
    };
    expect(resolvePropertyPlaceholder('created.year', properties)).toBe(
      'manual'
    );
  });

  it('prefers literal property keys over date format patterns', () => {
    const properties = {
      'created.YYYY-MM-DD': 'manual-format',
      created: '2025-06-13',
    };
    expect(resolvePropertyPlaceholder('created.YYYY-MM-DD', properties)).toBe(
      'manual-format'
    );
    expect(
      resolvePropertyPlaceholder('created:DD-MM-YYYY', {
        'created:DD-MM-YYYY': 'manual-colon',
        created: '2025-06-13',
      })
    ).toBe('manual-colon');
  });

  it('falls through to date components when a colon is not a format', () => {
    expect(
      resolvePropertyPlaceholder('due:date.year', {
        'due:date': '2025-06-13',
      })
    ).toBe('2025');
  });

  it('returns empty string for missing or invalid date values', () => {
    expect(resolvePropertyPlaceholder('created.year', {})).toBe('');
    expect(
      resolvePropertyPlaceholder('created.year', { created: 'invalid' })
    ).toBe('');
    expect(
      resolvePropertyPlaceholder('created.YYYY-MM-DD', { created: 'invalid' })
    ).toBe('');
  });
});
