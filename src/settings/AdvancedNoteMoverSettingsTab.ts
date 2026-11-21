import AdvancedNoteMoverPlugin from 'main';
import { PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
import {
  TriggerSettingsSection,
  AttachmentsSettingsSection,
  FilterSettingsSection,
  RulesSettingsSection,
  HistorySettingsSection,
  ImportExportSettingsSection,
  PerformanceDebugSettingsSection,
  UpdateSettingsSection,
  ConflictResolutionSettingsSection,
} from './sections';
import { DebounceManager } from '../utils/DebounceManager';
import { MobileUtils } from '../utils/MobileUtils';

export class AdvancedNoteMoverSettingsTab extends PluginSettingTab {
  private triggerSettings?: TriggerSettingsSection;
  private attachmentsSettings?: AttachmentsSettingsSection;
  private filterSettings?: FilterSettingsSection;
  private rulesSettings?: RulesSettingsSection;
  private historySettings?: HistorySettingsSection;
  private importExportSettings?: ImportExportSettingsSection;
  private performanceDebugSettings?: PerformanceDebugSettingsSection;
  private updateSettings?: UpdateSettingsSection;
  private conflictResolutionSettings?: ConflictResolutionSettingsSection;
  private debounceManager: DebounceManager;
  private readonly refreshSettings: () => void;

  constructor(private plugin: AdvancedNoteMoverPlugin) {
    super(plugin.app, plugin);

    this.debounceManager = new DebounceManager();
    this.refreshSettings = this.debounceManager.debounce(
      'display',
      () => this.refreshSettingsUi(),
      150
    );
  }

  display(): void {
    this.renderSettingsTab();
  }

  /**
   * Obsidian skips display() when this returns items. The sections render the
   * tab, so this stays empty and settings search on 1.13 does not list them.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [];
  }

  hide(): void {
    this.cleanupExistingSections();
    super.hide();
  }

  private refreshSettingsUi(): void {
    this.renderSettingsTab();
  }

  private renderSettingsTab(): void {
    this.containerEl.empty();

    // Add mobile-specific classes to container
    this.containerEl.addClass('advancedNoteMover-settings-root');
    MobileUtils.addMobileClass(this.containerEl);
    if (MobileUtils.isMobile()) {
      this.containerEl
        .closest('.vertical-tab-content')
        ?.addClass('advancedNoteMover-settings-vertical-tab');
    }

    // Clean up existing section instances before creating new ones
    this.cleanupExistingSections();

    // Ensure arrays exist but don't remove empty rules during display
    this.ensureArraysExist();

    this.triggerSettings = new TriggerSettingsSection(
      this.plugin,
      this.containerEl,
      this.refreshSettings
    );
    this.attachmentsSettings = new AttachmentsSettingsSection(
      this.plugin,
      this.containerEl,
      this.refreshSettings
    );
    this.filterSettings = new FilterSettingsSection(
      this.plugin,
      this.containerEl,
      this.refreshSettings
    );
    this.rulesSettings = new RulesSettingsSection(
      this.plugin,
      this.containerEl,
      this.refreshSettings
    );
    this.historySettings = new HistorySettingsSection(
      this.plugin,
      this.containerEl
    );
    this.importExportSettings = new ImportExportSettingsSection(
      this.plugin,
      this.containerEl,
      this.refreshSettings
    );
    this.performanceDebugSettings = new PerformanceDebugSettingsSection(
      this.plugin,
      this.containerEl,
      this.refreshSettings
    );
    this.updateSettings = new UpdateSettingsSection(
      this.plugin,
      this.containerEl
    );
    this.conflictResolutionSettings = new ConflictResolutionSettingsSection(
      this.plugin,
      this.containerEl
    );

    this.triggerSettings.addTriggerSettings();

    this.filterSettings.addFilterSettings();

    this.rulesSettings.addRulesSetting();
    this.rulesSettings.addCreateMissingFoldersSetting();
    this.rulesSettings.addRulesArray();
    this.rulesSettings.addVaultReEvaluationSetting();
    this.rulesSettings.addAddRuleButtonSetting();

    this.attachmentsSettings.addAttachmentSettings();

    this.conflictResolutionSettings.addConflictResolutionSettings();

    this.historySettings.addHistorySettings();

    this.importExportSettings.addImportExportSettings();

    this.performanceDebugSettings.addPerformanceDebugSettings();

    this.updateSettings.addUpdateSettings();
  }

  /**
   * Ensure filter array exists without removing empty rules during display
   */
  private ensureArraysExist(): void {
    if (!this.plugin.pluginData.settings.filters) {
      this.plugin.pluginData.settings.filters = { filter: [] };
    }
    if (!Array.isArray(this.plugin.pluginData.settings.filters.filter)) {
      this.plugin.pluginData.settings.filters.filter = [];
    }
  }

  /**
   * Clean up existing section instances to prevent memory leaks
   */
  private cleanupExistingSections(): void {
    this.filterSettings?.cleanup();
    this.rulesSettings?.cleanup();
    this.triggerSettings?.cleanup();
  }

  /**
   * Cleanup method to cancel any pending debounced operations and clean up sections
   */
  cleanup(): void {
    this.debounceManager.cancelAll();
    this.cleanupExistingSections();
  }
}
