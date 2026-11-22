import type AdvancedNoteMoverPlugin from 'main';
import { strings } from '../i18n/locale';
import { createError } from '../utils/Error';
import { setDebugEnabled } from '../utils/debug';
import { looksLikePluginDataRoot } from '../infrastructure/persistence/plugin-settings-schema';
import { validateAndRepairPluginData } from '../infrastructure/persistence/plugin-settings-controller';
import type { PluginData } from '../types/PluginData';

type RestoreTarget = Pick<
  AdvancedNoteMoverPlugin,
  | 'pluginData'
  | 'save_settings'
  | 'historyManager'
  | 'advancedNoteMover'
  | 'triggerHandler'
  | 'ruleCache'
  | 'syncRuleCacheHash'
>;

/**
 * Puts the backed-up settings back. Goes through the startup repair and
 * migration, keeps the current history and skip list, and re-registers triggers.
 */
export async function applyRestoredSettings(
  plugin: RestoreTarget,
  contents: string
): Promise<void> {
  const parsed: unknown = JSON.parse(contents);
  if (!looksLikePluginDataRoot(parsed)) {
    throw createError(strings().notices.importBackupInvalid);
  }
  const current = plugin.pluginData;
  plugin.pluginData = {
    ...(parsed as PluginData),
    history: current.history,
    conflictSkipCache: current.conflictSkipCache,
  };
  await validateAndRepairPluginData(plugin as never);
  await plugin.save_settings();

  setDebugEnabled(plugin.pluginData.settings.enablePerformanceDebug === true);
  plugin.historyManager.loadHistoryFromSettings();
  plugin.ruleCache.invalidateAll();
  plugin.advancedNoteMover.updateRuleManager();
  plugin.syncRuleCacheHash();
  plugin.triggerHandler.togglePeriodic();
  plugin.triggerHandler.toggleOnEditListener();
}
