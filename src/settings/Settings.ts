import AdvancedNoteMoverPlugin from 'main';
import { PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import {
  PeriodicMovementSettingsSection,
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
import {
  buildSettingDefinitions,
  getNestedSettingValue,
  setNestedSettingValue,
  type SettingDefinitionsHost,
} from './settingDefinitions';

export class AdvancedNoteMoverSettingsTab extends PluginSettingTab {
  private periodicMovementSettings: PeriodicMovementSettingsSection;
  private attachmentsSettings: AttachmentsSettingsSection;
  private filterSettings: FilterSettingsSection;
  private rulesSettings: RulesSettingsSection;
  private historySettings: HistorySettingsSection;
  private importExportSettings: ImportExportSettingsSection;
  private performanceDebugSettings: PerformanceDebugSettingsSection;
  private updateSettings: UpdateSettingsSection;
  private conflictResolutionSettings: ConflictResolutionSettingsSection;
  private debounceManager: DebounceManager;

  constructor(private plugin: AdvancedNoteMoverPlugin) {
    super(plugin.app, plugin);

    // Initialize debounce manager
    this.debounceManager = new DebounceManager();

    const debouncedDisplay = this.debounceManager.debounce(
      'display',
      () => this.refreshSettingsUi(),
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
    this.conflictResolutionSettings = new ConflictResolutionSettingsSection(
      plugin,
      this.containerEl
    );
  }

  display(): void {
    this.renderSettingsTab();
  }

  hide(): void {
    this.cleanupExistingSections();
    super.hide();
  }

  /**
   * 1.13.0+: used for settings search and for rendering this tab.
   * Older Obsidian versions ignore this and call {@link display} instead.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    this.ensureArraysExist();
    return buildSettingDefinitions(this.asSettingDefinitionsHost());
  }

  getControlValue(key: string): unknown {
    return getNestedSettingValue(this.plugin, key);
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    await setNestedSettingValue(this.asSettingDefinitionsHost(), key, value);
  }

  private asSettingDefinitionsHost(): SettingDefinitionsHost {
    return {
      plugin: this.plugin,
      filterSettings: this.filterSettings,
      rulesSettings: this.rulesSettings,
      importExportSettings: this.importExportSettings,
      update: () => this.callOptionalTabApi('update'),
      refreshDomState: () => this.callOptionalTabApi('refreshDomState'),
    };
  }

  /**
   * Rebuild the tab after a structural change. Uses the declarative API on
   * Obsidian 1.13+ and the imperative renderer on older versions.
   */
  private refreshSettingsUi(): void {
    if (this.callOptionalTabApi('update')) {
      return;
    }
    this.renderSettingsTab();
  }

  /**
   * Invokes 1.13+ SettingTab methods when the host provides them.
   * Looked up by name so `obsidianmd/no-unsupported-api` allows minAppVersion 1.8.7.
   */
  private callOptionalTabApi(
    methodName: 'update' | 'refreshDomState'
  ): boolean {
    const method = (this as unknown as Record<string, unknown>)[methodName];
    if (typeof method !== 'function') {
      return false;
    }
    (method as () => void).call(this);
    return true;
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

    const debouncedDisplay = this.debounceManager.debounce(
      'display',
      () => this.refreshSettingsUi(),
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
    this.conflictResolutionSettings = new ConflictResolutionSettingsSection(
      this.plugin,
      this.containerEl
    );

    this.periodicMovementSettings.addTriggerSettings();

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
