import type {
  ConflictResolutionSettings,
  ConflictResolutionStrategy,
} from '../types/ConflictResolution';
import type { SettingsData } from '../types/PluginData';

const DEFAULT_CONFLICT_RESOLUTION: ConflictResolutionSettings = {
  strategy: 'ask',
};

/** Resolves conflict settings with safe defaults. */
export function getConflictResolutionSettings(
  settings: SettingsData
): ConflictResolutionSettings {
  const conflict = settings.conflictResolution;
  const strategy = conflict?.strategy ?? DEFAULT_CONFLICT_RESOLUTION.strategy;
  if (
    strategy === 'ask' ||
    strategy === 'skip' ||
    strategy === 'rename' ||
    strategy === 'overwrite'
  ) {
    return { strategy };
  }
  return { ...DEFAULT_CONFLICT_RESOLUTION };
}

export function normalizeConflictStrategy(
  strategy: ConflictResolutionStrategy
): ConflictResolutionStrategy {
  if (
    strategy === 'ask' ||
    strategy === 'skip' ||
    strategy === 'rename' ||
    strategy === 'overwrite'
  ) {
    return strategy;
  }
  return 'ask';
}
