import AdvancedNoteMoverPlugin from 'main';
import { PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
import {
  PeriodicMovementSettingsSection,
  AttachmentsSettingsSection,
  FilterSettingsSection,
  RulesSettingsSection,
  HistorySettingsSection,
  ImportExportSettingsSection,
  PerformanceDebugSettingsSection,
  UpdateSettingsSection,
} from './sections';
import { DebounceManager } from '../utils/DebounceManager';
import { MobileUtils } from '../utils/MobileUtils';

export class AdvancedNoteMoverSettingsTab extends PluginSettingTab {
  private periodicMovementSettings: PeriodicMovementSettingsSection;
  private attachmentsSettings: AttachmentsSettingsSection;
  private filterSettings: FilterSettingsSection;
  private rulesSettings: RulesSettingsSection;
  private historySettings: HistorySettingsSection;
  private importExportSettings: ImportExportSettingsSection;
  private performanceDebugSettings: PerformanceDebugSettingsSection;
  private updateSettings: UpdateSettingsSection;
  private debounceManager: DebounceManager;

  constructor(private plugin: AdvancedNoteMoverPlugin) {
    super(plugin.app, plugin);

    // Initialize debounce manager
    this.debounceManager = new DebounceManager();

    // Create debounced display function
    const debouncedDisplay = this.debounceManager.debounce(
      'display',
      () => this.renderSettingsTab(),
      150 // 150ms delay to prevent rapid refreshes
    );

    // Initialize section classes
    this.periodicMovementSettings = new PeriodicMovementSettingsSection(
      plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.attachmentsSettings = new AttachmentsSettingsSection(
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
    this.performanceDebugSettings = new PerformanceDebugSettingsSection(
      plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.updateSettings = new UpdateSettingsSection(plugin, this.containerEl);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [];
  }

  display(): void {
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

    // Create debounced display function for this display call
    const debouncedDisplay = this.debounceManager.debounce(
      'display',
      () => this.renderSettingsTab(),
      150 // 150ms delay to prevent rapid refreshes
    );

    // Update containerEl references for all sections
    this.periodicMovementSettings = new PeriodicMovementSettingsSection(
      this.plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.attachmentsSettings = new AttachmentsSettingsSection(
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
    this.performanceDebugSettings = new PerformanceDebugSettingsSection(
      this.plugin,
      this.containerEl,
      debouncedDisplay
    );
    this.updateSettings = new UpdateSettingsSection(
      this.plugin,
      this.containerEl
    );

    this.periodicMovementSettings.addTriggerSettings();

    this.filterSettings.addFilterSettings();

    this.rulesSettings.addRulesSetting();
    this.rulesSettings.addRulesArray();
    this.rulesSettings.addVaultReEvaluationSetting();
    this.rulesSettings.addAddRuleButtonSetting();

    this.attachmentsSettings.addAttachmentSettings();

    this.historySettings.addHistorySettings();

    this.importExportSettings.addImportExportSettings();

    this.performanceDebugSettings.addPerformanceDebugSettings();

    this.updateSettings.addUpdateSettings();
  }

  /**
   * Ensure filter array exists without removing empty rules during display
   */
  private ensureArraysExist(): void {
    if (!this.plugin.settings.settings.filters) {
      this.plugin.settings.settings.filters = { filter: [] };
    }
    if (!Array.isArray(this.plugin.settings.settings.filters.filter)) {
      this.plugin.settings.settings.filters.filter = [];
    }
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
