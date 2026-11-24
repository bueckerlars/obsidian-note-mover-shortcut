import { describe, expect, it, vi } from 'vitest';
import { applyRestoredSettings } from './restore-settings-backup';
import { buildDefaultSettingsData } from '../infrastructure/persistence/plugin-settings-controller';

function fakePlugin() {
  const history = {
    history: [{ id: 'keep' }],
    bulkOperations: [],
  } as never;
  const plugin = {
    pluginData: {
      settings: buildDefaultSettingsData(),
      history,
      conflictSkipCache: { entries: [] },
    },
    save_settings: vi.fn(async () => {}),
    historyManager: { loadHistoryFromSettings: vi.fn() },
    advancedNoteMover: { updateRuleManager: vi.fn() },
    triggerHandler: { togglePeriodic: vi.fn(), toggleOnEditListener: vi.fn() },
    ruleCache: { invalidateAll: vi.fn() },
    syncRuleCacheHash: vi.fn(),
  };
  return { plugin, history };
}

describe('applyRestoredSettings', () => {
  it('replaces settings, keeps history and re-registers triggers', async () => {
    const { plugin, history } = fakePlugin();
    const backup = {
      settings: {
        ...buildDefaultSettingsData(),
        triggers: {
          enablePeriodicMovement: true,
          periodicMovementInterval: 15,
          enableOnEditTrigger: false,
        },
      },
      history: { history: [], bulkOperations: [] },
      schemaVersion: 1,
    };
    await applyRestoredSettings(plugin as never, JSON.stringify(backup));

    expect(plugin.pluginData.settings.triggers.periodicMovementInterval).toBe(
      15
    );
    expect(plugin.pluginData.history).toBe(history);
    expect(plugin.save_settings).toHaveBeenCalled();
    expect(plugin.triggerHandler.togglePeriodic).toHaveBeenCalled();
    expect(plugin.triggerHandler.toggleOnEditListener).toHaveBeenCalled();
  });

  it('rejects a file that is not plugin data', async () => {
    const { plugin } = fakePlugin();
    await expect(
      applyRestoredSettings(plugin as never, '{"foo":1}')
    ).rejects.toBeTruthy();
    expect(plugin.save_settings).not.toHaveBeenCalled();
  });
});
