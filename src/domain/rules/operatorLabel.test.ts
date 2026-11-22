import { describe, expect, it } from 'vitest';
import { operatorLabel } from './operatorLabel';

describe('operatorLabel', () => {
  it('reads operators as plain language', () => {
    expect(operatorLabel('includes item')).toBe('includes');
    expect(operatorLabel('does not include item')).toBe('does not include');
    expect(operatorLabel('does not starts with')).toBe('does not start with');
    expect(operatorLabel('is')).toBe('is');
  });
});
