import { Plugin } from 'obsidian';
import { AdvancedNoteMover } from 'src/core/AdvancedNoteMover';
import { CommandHandler } from 'src/handlers/CommandHandler';
import { AdvancedNoteMoverSettingsTab } from 'src/settings/Settings';
import { HistoryManager } from 'src/core/HistoryManager';
import { TriggerEventHandler } from 'src/core/TriggerEventHandler';
import { UpdateManager } from 'src/core/UpdateManager';
import { RuleEvaluationCache } from 'src/core/RuleEvaluationCache';
import type { PluginData } from 'src/types/PluginData';
import {
  loadPersistedSettings,
  savePersistedSettings,
} from 'src/infrastructure/persistence/plugin-settings-controller';
import {
  registerVaultEventHooks,
  registerVaultIndexMetadataListeners,
} from 'src/infrastructure/plugin/vault-event-hooks';
import { PluginVaultIndexCache } from 'src/infrastructure/cache/plugin-vault-index-cache';
import { PerformanceTraceRecorder } from 'src/infrastructure/debug/performance-trace';
import { createPluginApplicationServices } from 'src/application/plugin-application-services';
import type { PluginApplicationServices } from 'src/application/plugin-application-services';

export default class AdvancedNoteMoverPlugin extends Plugin {
  public settings!: PluginData;
  public advancedNoteMover!: AdvancedNoteMover;
  public command_handler!: CommandHandler;
  public historyManager!: HistoryManager;
  public updateManager!: UpdateManager;
  public triggerHandler!: TriggerEventHandler;
  public ruleCache!: RuleEvaluationCache;
  public vaultIndexCache!: PluginVaultIndexCache;
  public performanceTrace!: PerformanceTraceRecorder;
  private settingTab!: AdvancedNoteMoverSettingsTab;
  /** Application-layer facades (use-cases); core logic remains on `advancedNoteMover`. */
  public appServices!: PluginApplicationServices;

  async onload() {
    await loadPersistedSettings(this);

    this.ruleCache = new RuleEvaluationCache();
    this.vaultIndexCache = new PluginVaultIndexCache();
    this.performanceTrace = new PerformanceTraceRecorder(
      () => this.settings.settings.enablePerformanceDebug === true
    );
    this.vaultIndexCache.setCacheEnabledResolver(
      () => this.settings.settings.enableVaultIndexCache !== false
    );
    this.vaultIndexCache.setPerformanceRecorder(this.performanceTrace);
    this.historyManager = new HistoryManager(this);
    this.historyManager.loadHistoryFromSettings();
    this.updateManager = new UpdateManager(this);
    this.advancedNoteMover = new AdvancedNoteMover(this);
    this.appServices = createPluginApplicationServices(this);
    this.triggerHandler = new TriggerEventHandler(this);
    this.command_handler = new CommandHandler(this);
    this.command_handler.setup();

    this.addRibbonIcon('book-plus', 'Advanced Note Mover', () => {
      this.advancedNoteMover.moveFocusedNoteToDestination();
    });

    this.settingTab = new AdvancedNoteMoverSettingsTab(this);
    this.addSettingTab(this.settingTab);

    this.triggerHandler.togglePeriodic();
    this.triggerHandler.toggleOnEditListener();

    registerVaultEventHooks(this);
    registerVaultIndexMetadataListeners(this);

    this.syncRuleCacheHash();

    this.app.workspace.onLayoutReady(() => {
      this.updateManager.checkForUpdates();
    });
  }

  onunload() {
    this.settingTab?.cleanup();
    this.triggerHandler?.cleanup();
  }

  public syncRuleCacheHash(): void {
    const s = this.settings.settings;
    this.ruleCache.updateRulesHash(s.rulesV2 ?? [], s.filters.filter);
  }

  async save_settings(): Promise<void> {
    await savePersistedSettings(this);
  }

  async load_settings(): Promise<void> {
    await loadPersistedSettings(this);
  }
}
