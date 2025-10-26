import { Plugin, TFile } from 'obsidian';
import { NoteMoverShortcut } from 'src/core/NoteMoverShortcut';
import { CommandHandler } from 'src/handlers/CommandHandler';
import { NoteMoverShortcutSettingsTab } from 'src/settings/Settings';
import { HistoryManager } from 'src/core/HistoryManager';
import { TriggerEventHandler } from 'src/core/TriggerEventHandler';
import { UpdateManager } from 'src/core/UpdateManager';
import {
  PluginData,
  SettingsData,
  HistoryData,
  Filter,
} from 'src/types/PluginData';
import { SETTINGS_CONSTANTS } from 'src/config/constants';
import { SettingsValidator } from 'src/utils/SettingsValidator';
import { RuleMigrationService } from 'src/core/RuleMigrationService';

export default class NoteMoverShortcutPlugin extends Plugin {
  public settings: PluginData;
  public noteMover: NoteMoverShortcut;
  public command_handler: CommandHandler;
  public historyManager: HistoryManager;
  public updateManager: UpdateManager;
  public triggerHandler: TriggerEventHandler;
  private settingTab: NoteMoverShortcutSettingsTab;

  async onload() {
    await this.load_settings();

    this.historyManager = new HistoryManager(this);
    this.historyManager.loadHistoryFromSettings();
    this.updateManager = new UpdateManager(this);
    this.noteMover = new NoteMoverShortcut(this);
    this.triggerHandler = new TriggerEventHandler(this);
    this.command_handler = new CommandHandler(this);
    this.command_handler.setup();

    this.addRibbonIcon('book-plus', 'NoteMover', (evt: MouseEvent) => {
      this.noteMover.moveFocusedNoteToDestination();
    });

    this.settingTab = new NoteMoverShortcutSettingsTab(this);
    this.addSettingTab(this.settingTab);

    // Initialize triggers
    this.triggerHandler.togglePeriodic();
    this.triggerHandler.toggleOnEditListener();

    // Event listener for automatic history creation during manual file operations
    this.setupVaultEventListeners();

    // Check for updates after complete loading
    this.app.workspace.onLayoutReady(() => {
      this.updateManager.checkForUpdates();
    });
  }

  onunload() {
    // Cleanup settings tab debounce manager
    if (this.settingTab) {
      this.settingTab.cleanup();
    }
    // Cleanup trigger handler debounce manager
    if (this.triggerHandler) {
      this.triggerHandler.cleanup();
    }
    // Event listeners are automatically removed when the plugin is unloaded
  }

  /**
   * Setup of event listeners for automatic history creation
   */
  private setupVaultEventListeners(): void {
    // Monitor file renaming/moving
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        // Only for Markdown files
        if (file instanceof TFile && file.extension === 'md') {
          this.historyManager.addEntryFromVaultEvent(
            oldPath,
            file.path,
            file.name
          );
        }
      })
    );
  }

  async save_settings(): Promise<void> {
    // Ensure history in settings is kept in sync and robust against corruption
    const settingsAny = this.settings as any;
    const currentHistory = settingsAny.history;

    if (
      !currentHistory ||
      typeof currentHistory !== 'object' ||
      Array.isArray(currentHistory)
    ) {
      settingsAny.history = { history: [], bulkOperations: [] } as HistoryData;
    }
    if (!Array.isArray(settingsAny.history.history)) {
      settingsAny.history.history = [];
    }
    if (!Array.isArray(settingsAny.history.bulkOperations)) {
      settingsAny.history.bulkOperations = [];
    }
    await this.saveData(this.settings);
  }

  async load_settings(): Promise<void> {
    const savedData: any = await this.loadData();

    if (this.isPluginData(savedData)) {
      // Already in new format
      this.settings = savedData as PluginData;
    } else {
      // Migrate from old NoteMoverShortcutSettings format
      await this.backupLegacyDataJson();
      this.settings = this.migrateFromLegacy(savedData || {});
      await this.save_settings();
    }

    // Validate settings after loading to clean up any invalid data
    await this.validateSettings();
  }

  /**
   * Validate settings to prevent data loss
   */
  private async validateSettings(): Promise<void> {
    // Ensure nested structures exist
    if (!this.settings.settings) {
      this.settings.settings = this.buildDefaultSettingsData();
    }
    if (!this.settings.history) {
      this.settings.history = {
        history: [],
        bulkOperations: [],
      } as HistoryData;
    }

    // Ensure rules array exists
    if (!Array.isArray(this.settings.settings.rules)) {
      this.settings.settings.rules = [];
    }
    // Ensure filters array exists
    if (!this.settings.settings.filters) {
      this.settings.settings.filters = { filter: [] };
    }
    if (!Array.isArray(this.settings.settings.filters.filter)) {
      this.settings.settings.filters.filter = [];
    }

    // Ensure RuleV2 feature flag exists
    if (this.settings.settings.enableRuleV2 === undefined) {
      this.settings.settings.enableRuleV2 = false;
    }

    // Ensure RuleV2 array exists
    if (!Array.isArray(this.settings.settings.rulesV2)) {
      this.settings.settings.rulesV2 = [];
    }

    // Ensure schemaVersion exists
    if (this.settings.schemaVersion === undefined) {
      this.settings.schemaVersion = 1;
    }

    // Remove any invalid rules (empty criteria or path)
    this.settings.settings.rules = this.settings.settings.rules.filter(
      rule =>
        rule &&
        (rule as any).criteria &&
        (rule as any).path &&
        (rule as any).criteria.trim() !== '' &&
        (rule as any).path.trim() !== ''
    );

    // Remove any invalid filters (empty strings)
    this.settings.settings.filters.filter =
      this.settings.settings.filters.filter.filter(
        f => f && typeof f.value === 'string' && f.value.trim() !== ''
      );

    // Migrate V1 rules to V2 if feature flag is enabled and migration is needed
    if (this.settings.settings.enableRuleV2) {
      if (
        RuleMigrationService.shouldMigrate(
          this.settings.settings.rules,
          this.settings.settings.rulesV2
        )
      ) {
        console.log('Migrating Rule V1 to Rule V2...');
        this.settings.settings.rulesV2 = RuleMigrationService.migrateRules(
          this.settings.settings.rules
        );
        console.log(
          `Migrated ${this.settings.settings.rulesV2.length} rules to V2 format`
        );
        // Save migrated rules
        await this.save_settings();
      }
    }

    // Validate RuleV2 with regex pre-compilation
    if (
      this.settings.settings.rulesV2 &&
      this.settings.settings.rulesV2.length > 0
    ) {
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      SettingsValidator.validateRulesV2Array(
        this.settings.settings.rulesV2,
        validationResult
      );

      // Log any validation errors or warnings
      if (validationResult.errors.length > 0) {
        console.error('RuleV2 validation errors:', validationResult.errors);
      }
      if (validationResult.warnings.length > 0) {
        console.warn('RuleV2 validation warnings:', validationResult.warnings);
      }
    }
  }

  private isPluginData(data: any): data is PluginData {
    return (
      data &&
      typeof data === 'object' &&
      'settings' in data &&
      data.settings &&
      'history' in data &&
      data.history
    );
  }

  private buildDefaultSettingsData(): SettingsData {
    const defaults = SETTINGS_CONSTANTS.DEFAULT_SETTINGS as any;
    return {
      triggers: {
        enablePeriodicMovement: !!defaults.enablePeriodicMovement,
        periodicMovementInterval: defaults.periodicMovementInterval ?? 5,
        enableOnEditTrigger: !!defaults.enableOnEditTrigger,
      },
      filters: {
        filter: Array.isArray(defaults.filter)
          ? (defaults.filter as string[]).map(v => ({ value: v }) as Filter)
          : [],
      },
      rules: Array.isArray(defaults.rules) ? defaults.rules : [],
      retentionPolicy: defaults.retentionPolicy,
      enableRuleV2: false,
      rulesV2: [],
    } as SettingsData;
  }

  private migrateFromLegacy(legacy: any): PluginData {
    const defaults = SETTINGS_CONSTANTS.DEFAULT_SETTINGS as any;

    const enablePeriodicMovement =
      legacy?.enablePeriodicMovement ??
      defaults.enablePeriodicMovement ??
      false;
    const periodicMovementInterval =
      legacy?.periodicMovementInterval ??
      defaults.periodicMovementInterval ??
      5;
    const enableOnEditTrigger =
      legacy?.enableOnEditTrigger ?? defaults.enableOnEditTrigger ?? false;
    const retentionPolicy = legacy?.retentionPolicy ?? defaults.retentionPolicy;

    const rules = Array.isArray(legacy?.rules) ? legacy.rules : [];
    const filterValues: string[] = Array.isArray(legacy?.filter)
      ? legacy.filter
      : [];
    const filters: Filter[] = filterValues
      .filter(v => typeof v === 'string')
      .map(v => ({ value: v }));

    const historyArray = Array.isArray(legacy?.history) ? legacy.history : [];
    const bulkOps = Array.isArray(legacy?.bulkOperations)
      ? legacy.bulkOperations
      : [];

    const data: PluginData = {
      settings: {
        triggers: {
          enablePeriodicMovement,
          periodicMovementInterval,
          enableOnEditTrigger,
        },
        filters: { filter: filters },
        rules,
        retentionPolicy,
        enableRuleV2: false,
      },
      history: {
        history: historyArray,
        bulkOperations: bulkOps,
      },
      lastSeenVersion: legacy?.lastSeenVersion,
      schemaVersion: 1,
    };

    return data;
  }

  private async backupLegacyDataJson(): Promise<void> {
    try {
      const configDir = (this.app.vault as any).configDir || '.obsidian';
      const adapter: any = this.app.vault.adapter as any;
      const dataPath = `${configDir}/plugins/${this.manifest.id}/data.json`;
      const exists = await adapter.exists?.(dataPath);
      if (!exists) return;
      const iso = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${configDir}/plugins/${this.manifest.id}/data.backup.${iso}.json`;
      const content = await adapter.read(dataPath);
      await adapter.write(backupPath, content);
    } catch (e) {
      // Best-effort backup; ignore errors
    }
  }
}
