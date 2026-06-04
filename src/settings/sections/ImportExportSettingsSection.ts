import AdvancedNoteMoverPlugin from 'main';
import { App, Setting } from 'obsidian';
import type { PluginData, SettingsData } from '../../types/PluginData';
import type { RetentionPolicy } from '../../types/HistoryEntry';
import type { LegacyRuleV1 } from '../../core/RuleMigrationService';
import type { LegacySettingsFields } from '../../infrastructure/persistence/plugin-settings-controller';
import { createError, handleError } from 'src/utils/Error';
import { NoticeManager } from 'src/utils/NoticeManager';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { SettingsValidator } from 'src/utils/SettingsValidator';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { RuleMigrationService } from 'src/core/RuleMigrationService';
import { MobileUtils } from '../../utils/MobileUtils';

export class ImportExportSettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addImportExportSettings(): void {
    const isMobile = MobileUtils.isMobile();
    new Setting(this.containerEl).setName('Import/export').setHeading();

    // Export Settings Button
    const exportSetting = new Setting(this.containerEl)
      .setName('Export settings')
      .setDesc('Export your current settings as a JSON file')
      .addButton(btn => {
        btn
          .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.EXPORT_SETTINGS)
          .setCta()
          .onClick(() => {
            void (async () => {
              btn.setDisabled(true);
              try {
                await this.exportSettings();
              } finally {
                btn.setDisabled(false);
              }
            })();
          });
      });

    // Add mobile optimization classes
    if (isMobile) {
      exportSetting.settingEl.addClass('advancedNoteMover-mobile-optimized');
      const controlEl = exportSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass(
          'advancedNoteMover-mobile-button-control'
        );
      }
    }

    // Import Settings Button
    const importSetting = new Setting(this.containerEl)
      .setName('Import settings')
      .setDesc('Import settings from a JSON file')
      .addButton(btn => {
        btn
          .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS)
          .setDestructive()
          .onClick(() => {
            void (async () => {
              btn.setDisabled(true);
              try {
                await this.importSettings();
              } finally {
                btn.setDisabled(false);
              }
            })();
          });
      });

    // Add mobile optimization classes
    if (isMobile) {
      importSetting.settingEl.addClass('advancedNoteMover-mobile-optimized');
      const controlEl = importSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass(
          'advancedNoteMover-mobile-button-control'
        );
      }
    }
  }

  private async exportSettings(): Promise<void> {
    try {
      // Build export object without history
      const settingsToExport: Partial<PluginData> = {
        settings: this.plugin.settings.settings,
        lastSeenVersion: this.plugin.settings.lastSeenVersion,
        schemaVersion: this.plugin.settings.schemaVersion,
      };

      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(settingsToExport, null, 2);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = activeDocument.createElement('a');
      link.href = url;
      link.download = `note-mover-settings-${new Date().toISOString().split('T')[0]}.json`;

      // Trigger download
      activeDocument.body.appendChild(link);
      link.click();
      activeDocument.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      // Show success message
      NoticeManager.info(SETTINGS_CONSTANTS.UI_TEXTS.EXPORT_SUCCESS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      handleError(
        createError(`Export failed: ${msg}`),
        'Export settings',
        false
      );
    }
  }

  private async importSettings(): Promise<void> {
    try {
      // Create file input element
      const input = activeDocument.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.classList.add('advancedNoteMover-hidden-file-input');

      // Add to DOM temporarily
      activeDocument.body.appendChild(input);

      // Handle file selection
      const file = await new Promise<File>((resolve, reject) => {
        input.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          if (target.files && target.files[0]) {
            resolve(target.files[0]);
          } else {
            reject(new Error('No file selected'));
          }
        };
        input.click();
      });

      // Clean up input element
      activeDocument.body.removeChild(input);

      // Read file content
      const fileContent = await this.readFileAsText(file);

      // Parse JSON
      let importedSettings: unknown;
      try {
        importedSettings = JSON.parse(fileContent);
      } catch {
        handleError(
          createError(SETTINGS_CONSTANTS.UI_TEXTS.INVALID_FILE),
          'Import settings',
          false
        );
        return;
      }

      // Validate settings
      const validation = SettingsValidator.validateSettings(importedSettings);

      if (!validation.isValid) {
        const errorMessage = `${SETTINGS_CONSTANTS.UI_TEXTS.VALIDATION_ERRORS}:\n${validation.errors.join('\n')}`;
        handleError(createError(errorMessage), 'Import settings', false);
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        NoticeManager.warning(
          `Import warnings: ${validation.warnings.join(', ')}`
        );
      }

      // Show confirmation modal
      const confirmed = await ConfirmModal.show(this.app, {
        title: SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS_TITLE,
        message: SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS_MESSAGE,
        confirmText: SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS_CONFIRM,
        cancelText: SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS_CANCEL,
        danger: true,
      });

      if (confirmed) {
        const current = this.plugin.settings;

        // If imported in new PluginData shape, apply directly
        const pluginImport =
          importedSettings &&
          typeof importedSettings === 'object' &&
          'settings' in importedSettings &&
          importedSettings.settings &&
          typeof importedSettings.settings === 'object'
            ? (importedSettings as Partial<PluginData>)
            : null;

        if (pluginImport?.settings) {
          const s = pluginImport.settings as unknown as Record<string, unknown>;

          const triggers = s.triggers;
          if (triggers && typeof triggers === 'object') {
            const t = triggers as Record<string, unknown>;
            if (t.enablePeriodicMovement !== undefined) {
              current.settings.triggers.enablePeriodicMovement =
                !!t.enablePeriodicMovement;
            }
            if (t.periodicMovementInterval !== undefined) {
              current.settings.triggers.periodicMovementInterval = Number(
                t.periodicMovementInterval
              );
            }
            if (t.enableOnEditTrigger !== undefined) {
              current.settings.triggers.enableOnEditTrigger =
                !!t.enableOnEditTrigger;
            }
          }

          const filters = s.filters;
          if (filters && typeof filters === 'object') {
            const f = filters as { filter?: unknown };
            const arr = Array.isArray(f.filter) ? f.filter : [];
            current.settings.filters.filter = arr
              .filter(
                (item): item is { value: string } =>
                  !!item &&
                  typeof item === 'object' &&
                  'value' in item &&
                  typeof (item as { value: unknown }).value === 'string'
              )
              .map(item => ({ value: item.value }));
          }

          if (Array.isArray(s.rules)) {
            (current.settings as SettingsData & LegacySettingsFields).rules =
              s.rules as LegacyRuleV1[];
          }

          if (s.retentionPolicy && typeof s.retentionPolicy === 'object') {
            current.settings.retentionPolicy =
              s.retentionPolicy as RetentionPolicy;
          }

          if (pluginImport.lastSeenVersion !== undefined) {
            current.lastSeenVersion = pluginImport.lastSeenVersion;
          }

          if (pluginImport.schemaVersion !== undefined) {
            current.schemaVersion = pluginImport.schemaVersion;
          }

          if (Array.isArray(s.rulesV2)) {
            current.settings.rulesV2 = s.rulesV2 as SettingsData['rulesV2'];
          }
        } else {
          // Legacy import path: sanitize and map into new structure
          const sanitizedSettings =
            SettingsValidator.sanitizeSettings(importedSettings);

          if (sanitizedSettings.enablePeriodicMovement !== undefined) {
            current.settings.triggers.enablePeriodicMovement =
              !!sanitizedSettings.enablePeriodicMovement;
          }
          if (sanitizedSettings.periodicMovementInterval !== undefined) {
            current.settings.triggers.periodicMovementInterval = Number(
              sanitizedSettings.periodicMovementInterval
            );
          }
          if (sanitizedSettings.enableOnEditTrigger !== undefined) {
            current.settings.triggers.enableOnEditTrigger =
              !!sanitizedSettings.enableOnEditTrigger;
          }
          if (Array.isArray(sanitizedSettings.filter)) {
            current.settings.filters.filter = sanitizedSettings.filter
              .filter((v: unknown) => typeof v === 'string')
              .map((v: string) => ({ value: v }));
          }
          if (Array.isArray(sanitizedSettings.rules)) {
            (current.settings as SettingsData & LegacySettingsFields).rules =
              sanitizedSettings.rules as LegacyRuleV1[];
          }
          if (
            sanitizedSettings.retentionPolicy &&
            typeof sanitizedSettings.retentionPolicy === 'object'
          ) {
            current.settings.retentionPolicy =
              sanitizedSettings.retentionPolicy as RetentionPolicy;
          }
          if (typeof sanitizedSettings.lastSeenVersion === 'string') {
            current.lastSeenVersion = sanitizedSettings.lastSeenVersion;
          }
        }

        const legacyRules = (
          current.settings as SettingsData & LegacySettingsFields
        ).rules;
        if (
          Array.isArray(legacyRules) &&
          RuleMigrationService.shouldMigrate(
            legacyRules,
            current.settings.rulesV2 ?? []
          )
        ) {
          console.debug('Migrating imported Rule V1 to Rule V2...');
          current.settings.rulesV2 =
            RuleMigrationService.migrateRules(legacyRules);
          (current.settings as SettingsData & LegacySettingsFields).rules = [];
          console.debug(
            `Migrated ${(current.settings.rulesV2 ?? []).length} imported rules to V2 format`
          );
        }

        // Save settings
        await this.plugin.save_settings();

        // Update RuleManager
        this.plugin.advancedNoteMover.updateRuleManager();

        // Refresh the settings display
        this.refreshDisplay();

        // Show success message
        NoticeManager.success(SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SUCCESS);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg !== 'File selection cancelled') {
        handleError(
          createError(`Import failed: ${msg}`),
          'Import settings',
          false
        );
      }
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private get app(): App {
    return this.plugin.app;
  }
}
