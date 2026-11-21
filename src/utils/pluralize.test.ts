import { describe, expect, it } from 'vitest';
import { pluralize } from './pluralize';

describe('pluralize', () => {
  it('uses the plural for zero', () => {
    expect(pluralize(0, 'file')).toBe('0 files');
  });

  it('uses the singular for one', () => {
    expect(pluralize(1, 'file')).toBe('1 file');
  });

  it('uses the plural for more than one', () => {
    expect(pluralize(2, 'file')).toBe('2 files');
  });
});
