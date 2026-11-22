import { describe, expect, it } from 'vitest';
import {
  isCustomRetentionKey,
  keyToRetention,
  retentionToKey,
} from './historyRetention';

describe('history retention mapping', () => {
  it('maps legacy units onto day counts', () => {
    expect(retentionToKey({ value: 30, unit: 'days' })).toBe('30');
    expect(retentionToKey({ value: 2, unit: 'weeks' })).toBe('14');
    expect(retentionToKey({ value: 3, unit: 'months' })).toBe('90');
  });

  it('treats a zero value as forever', () => {
    expect(retentionToKey({ value: 0, unit: 'days' })).toBe('forever');
    expect(keyToRetention('forever')).toEqual({ value: 0, unit: 'days' });
  });

  it('round-trips presets and flags other values as custom', () => {
    expect(keyToRetention('365')).toEqual({ value: 365, unit: 'days' });
    expect(isCustomRetentionKey('90')).toBe(false);
    expect(isCustomRetentionKey('14')).toBe(true);
    expect(isCustomRetentionKey('forever')).toBe(false);
  });
});
