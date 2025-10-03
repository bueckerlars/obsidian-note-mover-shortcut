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

/**
 * @deprecated Use PluginData instead
 */
export interface NoteMoverShortcutSettings {
  enablePeriodicMovement: boolean;
  periodicMovementInterval: number;
  enableOnEditTrigger?: boolean;
  filter: string[];
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

    // Clean up existing section instances before creating new ones
    this.cleanupExistingSections();

    // Ensure arrays exist but don't remove empty rules during display
    this.ensureArraysExist();

    // Create debounced display function for this display call
    const debouncedDisplay = this.debounceManager.debounce(
      'display',
      () => this.display(),
      150 // 150ms delay to prevent rapid refreshes
    );

    // Update containerEl references for all sections
    this.periodicMovementSettings = new PeriodicMovementSettingsSection(
      this.plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.filterSettings = new FilterSettingsSection(
      this.plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.rulesSettings = new RulesSettingsSection(
      this.plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.historySettings = new HistorySettingsSection(
      this.plugin,
      this.containerEl
    );
    this.importExportSettings = new ImportExportSettingsSection(
      this.plugin,
      this.containerEl,
      debouncedDisplay
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
   * Ensure arrays exist without removing empty rules during display
   */
  private ensureArraysExist(): void {
    // Ensure rules array exists and is valid
    if (!Array.isArray(this.plugin.settings.settings?.rules)) {
      (this.plugin.settings as any).settings =
        this.plugin.settings.settings || ({} as any);
      (this.plugin.settings.settings as any).rules = [];
    }

    // Ensure filter array exists and is valid
    if (!Array.isArray(this.plugin.settings.settings?.filters?.filter)) {
      (this.plugin.settings as any).settings =
        this.plugin.settings.settings || ({} as any);
      (this.plugin.settings.settings as any).filters =
        this.plugin.settings.settings.filters || ({} as any);
      (this.plugin.settings.settings.filters as any).filter = [];
    }
  }

  /**
   * Validate settings to prevent data loss during rendering
   * This method should only be called when explicitly validating settings
   */
  private validateSettings(): void {
    // Ensure arrays exist first
    this.ensureArraysExist();

    // Remove any invalid rules (empty criteria or path)
    this.plugin.settings.settings.rules =
      this.plugin.settings.settings.rules.filter(
        (rule: any) =>
          rule &&
          rule.criteria &&
          rule.path &&
          rule.criteria.trim() !== '' &&
          rule.path.trim() !== ''
      );

    // Remove any invalid filters (empty strings)
    this.plugin.settings.settings.filters.filter =
      this.plugin.settings.settings.filters.filter.filter(
        (filter: any) =>
          filter &&
          typeof filter.value === 'string' &&
          filter.value.trim() !== ''
      );
  }

  /**
   * Clean up existing section instances to prevent memory leaks
   */
  private cleanupExistingSections(): void {
    if (
      this.filterSettings &&
      typeof this.filterSettings.cleanup === 'function'
    ) {
      this.filterSettings.cleanup();
    }
    if (
      this.rulesSettings &&
      typeof this.rulesSettings.cleanup === 'function'
    ) {
      this.rulesSettings.cleanup();
    }
    // Note: Other sections don't have AdvancedSuggest instances, so no cleanup needed
  }

  /**
   * Cleanup method to cancel any pending debounced operations and clean up sections
   */
  cleanup(): void {
    this.debounceManager.cancelAll();
    this.cleanupExistingSections();
  }
}
