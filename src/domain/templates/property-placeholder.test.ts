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
  });

  it('resolves date components from base properties', () => {
    const properties = { created: '2025-06-13' };
    expect(resolvePropertyPlaceholder('created.year', properties)).toBe('2025');
    expect(resolvePropertyPlaceholder('created.month', properties)).toBe('06');
    expect(resolvePropertyPlaceholder('created.monthName', properties)).toBe(
      'June'
    );
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

  it('returns empty string for missing or invalid date values', () => {
    expect(resolvePropertyPlaceholder('created.year', {})).toBe('');
    expect(
      resolvePropertyPlaceholder('created.year', { created: 'invalid' })
    ).toBe('');
  });
});
