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
  onlyMoveNotesWithRules: boolean;
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

  constructor(private plugin: NoteMoverShortcutPlugin) {
    super(plugin.app, plugin);

    // Initialize section classes
    this.periodicMovementSettings = new PeriodicMovementSettingsSection(
      plugin,
      this.containerEl,
      () => this.display()
    );
    this.filterSettings = new FilterSettingsSection(
      plugin,
      this.containerEl,
      () => this.display()
    );
    this.rulesSettings = new RulesSettingsSection(
      plugin,
      this.containerEl,
      () => this.display()
    );
    this.historySettings = new HistorySettingsSection(plugin, this.containerEl);
    this.importExportSettings = new ImportExportSettingsSection(
      plugin,
      this.containerEl,
      () => this.display()
    );
  }

  display(): void {
    this.containerEl.empty();

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
}
