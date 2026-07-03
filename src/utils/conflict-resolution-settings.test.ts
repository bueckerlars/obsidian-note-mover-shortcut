import { describe, expect, it } from 'vitest';
import { deriveConflictInteractive } from './conflict-resolution-settings';
import type { SettingsData } from '../types/PluginData';

const settingsWithStrategy = (
  strategy: SettingsData['conflictResolution']
): SettingsData =>
  ({
    conflictResolution: strategy,
  }) as SettingsData;

describe('deriveConflictInteractive', () => {
  it('returns true for automatic moves when strategy is ask', () => {
    expect(
      deriveConflictInteractive(
        settingsWithStrategy({ strategy: 'ask' }),
        false
      )
    ).toBe(true);
  });

  it('returns true for manual moves regardless of strategy', () => {
    expect(
      deriveConflictInteractive(
        settingsWithStrategy({ strategy: 'skip' }),
        true
      )
    ).toBe(true);
  });

  it('returns false for automatic moves when strategy is not ask', () => {
    expect(
      deriveConflictInteractive(
        settingsWithStrategy({ strategy: 'rename' }),
        false
      )
    ).toBe(false);
  });

  it('defaults to skip and disables interactive for automatic moves', () => {
    expect(deriveConflictInteractive({} as SettingsData, false)).toBe(false);
  });
});
