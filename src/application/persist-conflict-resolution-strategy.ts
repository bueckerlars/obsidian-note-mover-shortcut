import type AdvancedNoteMoverPlugin from 'main';
import type { ConflictResolutionStrategy } from '../types/ConflictResolution';
import { NoticeManager } from '../utils/NoticeManager';

/** Persists a new default conflict strategy and clears stale skip-cache entries. */
export async function persistConflictResolutionStrategy(
  plugin: AdvancedNoteMoverPlugin,
  strategy: ConflictResolutionStrategy
): Promise<void> {
  const previousStrategy =
    plugin.pluginData.settings.conflictResolution?.strategy ?? 'skip';
  plugin.pluginData.settings.conflictResolution = { strategy };
  if (previousStrategy !== strategy) {
    await plugin.conflictSkipCacheManager.clearAll();
  }
  await plugin.save_settings();
  NoticeManager.info(`Conflict resolution strategy set to "${strategy}".`);
}
