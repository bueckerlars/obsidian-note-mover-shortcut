import AdvancedNoteMoverPlugin from 'main';
import { PluginSettingTab } from 'obsidian';
import {
  PeriodicMovementSettingsSection,
  FilterSettingsSection,
  RulesSettingsSection,
  HistorySettingsSection,
  ImportExportSettingsSection,
  PerformanceDebugSettingsSection,
} from './sections';
import { DebounceManager } from '../utils/DebounceManager';
import { MobileUtils } from '../utils/MobileUtils';

export class AdvancedNoteMoverSettingsTab extends PluginSettingTab {
  private periodicMovementSettings: PeriodicMovementSettingsSection;
  private filterSettings: FilterSettingsSection;
  private rulesSettings: RulesSettingsSection;
  private historySettings: HistorySettingsSection;
  private importExportSettings: ImportExportSettingsSection;
  private performanceDebugSettings: PerformanceDebugSettingsSection;
  private debounceManager: DebounceManager;

  constructor(private plugin: AdvancedNoteMoverPlugin) {
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
    this.performanceDebugSettings = new PerformanceDebugSettingsSection(
      plugin,
      this.containerEl,
      debouncedDisplay
    );
  }

  display(): void {
    this.containerEl.empty();

    // Add mobile-specific classes to container
    MobileUtils.addMobileClass(this.containerEl);

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
    this.performanceDebugSettings = new PerformanceDebugSettingsSection(
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

    this.performanceDebugSettings.addPerformanceDebugSettings();
  }

  /**
   * Ensure filter array exists without removing empty rules during display
   */
  private ensureArraysExist(): void {
    if (!Array.isArray(this.plugin.settings.settings?.filters?.filter)) {
      (this.plugin.settings as any).settings =
        this.plugin.settings.settings || ({} as any);
      (this.plugin.settings.settings as any).filters =
        this.plugin.settings.settings.filters || ({} as any);
      (this.plugin.settings.settings.filters as any).filter = [];
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
