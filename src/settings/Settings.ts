import NoteMoverShortcutPlugin from 'main';
import { PluginSettingTab } from 'obsidian';
import {
  HistoryEntry,
  BulkOperation,
  RetentionPolicy,
} from '../types/HistoryEntry';
import { SETTINGS_CONSTANTS } from '../config/constants';
import {
  PeriodicMovementSettingsSection,
  FilterSettingsSection,
  RulesSettingsSection,
  HistorySettingsSection,
  ImportExportSettingsSection,
} from './sections';
import { DebounceManager } from '../utils/DebounceManager';

interface Rule {
  criteria: string; // Format: "type: value" (e.g. "tag: #project", "fileName: notes.md")
  path: string;
}

export interface NoteMoverShortcutSettings {
  enablePeriodicMovement: boolean;
  periodicMovementInterval: number;
  enableOnEditTrigger?: boolean;
  filter: string[];
  isFilterWhitelist: boolean;
  rules: Rule[];
  history?: HistoryEntry[];
  bulkOperations?: BulkOperation[];
  lastSeenVersion?: string;
  retentionPolicy?: RetentionPolicy;
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings =
  SETTINGS_CONSTANTS.DEFAULT_SETTINGS;

export class NoteMoverShortcutSettingsTab extends PluginSettingTab {
  private periodicMovementSettings: PeriodicMovementSettingsSection;
  private filterSettings: FilterSettingsSection;
  private rulesSettings: RulesSettingsSection;
  private historySettings: HistorySettingsSection;
  private importExportSettings: ImportExportSettingsSection;
  private debounceManager: DebounceManager;

  constructor(private plugin: NoteMoverShortcutPlugin) {
    super(plugin.app, plugin);

    // Initialize debounce manager
    this.debounceManager = new DebounceManager();

    // Create debounced display function
    const debouncedDisplay = this.debounceManager.debounce(
      'display',
      () => this.display(),
      150 // 150ms delay to prevent rapid refreshes
    );

    // Initialize section classes
    this.periodicMovementSettings = new PeriodicMovementSettingsSection(
      plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.filterSettings = new FilterSettingsSection(
      plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.rulesSettings = new RulesSettingsSection(
      plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.historySettings = new HistorySettingsSection(plugin, this.containerEl);
    this.importExportSettings = new ImportExportSettingsSection(
      plugin,
      this.containerEl,
      debouncedDisplay
    );
  }

  display(): void {
    this.containerEl.empty();

    // Validate settings before rendering to prevent data loss
    this.validateSettings();

    // Update containerEl references for all sections
    this.periodicMovementSettings = new PeriodicMovementSettingsSection(
      this.plugin,
      this.containerEl,
      () => this.display()
    );
    this.filterSettings = new FilterSettingsSection(
      this.plugin,
      this.containerEl,
      () => this.display()
    );
    this.rulesSettings = new RulesSettingsSection(
      this.plugin,
      this.containerEl,
      () => this.display()
    );
    this.historySettings = new HistorySettingsSection(
      this.plugin,
      this.containerEl
    );
    this.importExportSettings = new ImportExportSettingsSection(
      this.plugin,
      this.containerEl,
      () => this.display()
    );

    this.periodicMovementSettings.addTriggerSettings();

    this.filterSettings.addFilterSettings();

    this.rulesSettings.addRulesSetting();
    this.rulesSettings.addRulesArray();
    this.rulesSettings.addAddRuleButtonSetting();

    this.historySettings.addHistorySettings();

    this.importExportSettings.addImportExportSettings();
  }

  /**
   * Validate settings to prevent data loss during rendering
   */
  private validateSettings(): void {
    // Ensure rules array exists and is valid
    if (!Array.isArray(this.plugin.settings.rules)) {
      this.plugin.settings.rules = [];
    }

    // Ensure filter array exists and is valid
    if (!Array.isArray(this.plugin.settings.filter)) {
      this.plugin.settings.filter = [];
    }

    // Remove any invalid rules (empty criteria or path)
    this.plugin.settings.rules = this.plugin.settings.rules.filter(
      rule =>
        rule &&
        rule.criteria &&
        rule.path &&
        rule.criteria.trim() !== '' &&
        rule.path.trim() !== ''
    );

    // Remove any invalid filters (empty strings)
    this.plugin.settings.filter = this.plugin.settings.filter.filter(
      filter => filter && filter.trim() !== ''
    );
  }

  /**
   * Cleanup method to cancel any pending debounced operations
   */
  cleanup(): void {
    this.debounceManager.cancelAll();
  }
}
