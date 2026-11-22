import { getLanguage, Plugin } from 'obsidian';
import { AdvancedNoteMover } from 'src/core/AdvancedNoteMover';
import { CommandHandler } from 'src/handlers/CommandHandler';
import { AdvancedNoteMoverSettingsTab } from 'src/settings/AdvancedNoteMoverSettingsTab';
import { HistoryManager } from 'src/core/HistoryManager';
import { ConflictSkipCacheManager } from 'src/core/ConflictSkipCacheManager';
import { TriggerEventHandler } from 'src/core/TriggerEventHandler';
import { UpdateManager } from 'src/core/UpdateManager';
import { RuleEvaluationCache } from 'src/core/RuleEvaluationCache';
import type { SettingsPage } from 'src/settings/pages';
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
import { setDebugEnabled } from 'src/utils/debug';
import { strings } from 'src/i18n/locale';
import { loadPluginLocale } from 'src/i18n/plugin-locale';

export default class AdvancedNoteMoverPlugin extends Plugin {
  /** Persisted plugin payload (not Obsidian 1.13+ `Plugin.settings`). */
  declare pluginData: PluginData;
  public advancedNoteMover!: AdvancedNoteMover;
  public command_handler!: CommandHandler;
  public historyManager!: HistoryManager;
  public conflictSkipCacheManager!: ConflictSkipCacheManager;
  public updateManager!: UpdateManager;
  public triggerHandler!: TriggerEventHandler;
  public ruleCache!: RuleEvaluationCache;
  public vaultIndexCache!: PluginVaultIndexCache;
  public performanceTrace!: PerformanceTraceRecorder;
  public settingTab!: AdvancedNoteMoverSettingsTab;
  private pendingSkipCacheInvalidation = false;
  /** Application-layer facades (use-cases); core logic remains on `advancedNoteMover`. */
  public appServices!: PluginApplicationServices;

  async onload() {
    await loadPluginLocale(this.app, this.manifest, getLanguage());
    await loadPersistedSettings(this);
    setDebugEnabled(this.pluginData.settings.enablePerformanceDebug === true);

    this.ruleCache = new RuleEvaluationCache();
    this.vaultIndexCache = new PluginVaultIndexCache();
    this.performanceTrace = new PerformanceTraceRecorder(
      () => this.pluginData.settings.enablePerformanceDebug === true
    );
    this.vaultIndexCache.setCacheEnabledResolver(
      () => this.pluginData.settings.enableVaultIndexCache !== false
    );
    this.vaultIndexCache.setPerformanceRecorder(this.performanceTrace);
    this.historyManager = new HistoryManager(this);
    this.historyManager.loadHistoryFromSettings();
    await this.historyManager.cleanupOldEntries(true);
    this.conflictSkipCacheManager = new ConflictSkipCacheManager(this);
    await this.conflictSkipCacheManager.prune(this.app);
    this.updateManager = new UpdateManager(this);
    this.advancedNoteMover = new AdvancedNoteMover(this);
    if (this.pendingSkipCacheInvalidation) {
      this.pendingSkipCacheInvalidation = false;
      void this.advancedNoteMover.invalidateConflictSkipCacheForRuleChange();
    }
    this.appServices = createPluginApplicationServices(this);
    this.triggerHandler = new TriggerEventHandler(this);
    this.command_handler = new CommandHandler(this);
    this.command_handler.setup();

    this.addRibbonIcon('book-plus', strings().commands.moveActiveNote, () => {
      void this.advancedNoteMover.moveFocusedNoteToDestination();
    });

    this.settingTab = new AdvancedNoteMoverSettingsTab(this);
    this.addSettingTab(this.settingTab);

    this.triggerHandler.togglePeriodic();
    this.triggerHandler.toggleOnEditListener();

    registerVaultEventHooks(this);
    registerVaultIndexMetadataListeners(this);

    this.syncRuleCacheHash();

    this.app.workspace.onLayoutReady(() => {
      void this.updateManager.checkForUpdates();
    });
  }

  onunload() {
    this.settingTab?.cleanup();
    this.triggerHandler?.cleanup();
  }

  /** Opens this plugin's settings tab on the given page. */
  public openSettingsPage(page: SettingsPage): void {
    this.settingTab.showPage(page);
    // shortcut: app.setting is not in the public typings; no other way to open a tab by id.
    const setting = (
      this.app as unknown as {
        setting?: { open(): void; openTabById(id: string): void };
      }
    ).setting;
    setting?.open();
    setting?.openTabById(this.manifest.id);
  }

  public syncRuleCacheHash(): void {
    const s = this.pluginData.settings;
    const rulesChanged = this.ruleCache.updateRulesHash(
      s.rulesV2 ?? [],
      s.filters.filter
    );
    if (rulesChanged) {
      if (this.advancedNoteMover) {
        void this.advancedNoteMover.invalidateConflictSkipCacheForRuleChange();
      } else {
        this.pendingSkipCacheInvalidation = true;
      }
    }
  }

  async save_settings(): Promise<void> {
    await savePersistedSettings(this);
  }

  async load_settings(): Promise<void> {
    await loadPersistedSettings(this);
  }
}
