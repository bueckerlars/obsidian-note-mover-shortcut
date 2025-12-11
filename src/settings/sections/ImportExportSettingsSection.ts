import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { createError, handleError } from 'src/utils/Error';
import { NoticeManager } from 'src/utils/NoticeManager';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { SettingsValidator } from 'src/utils/SettingsValidator';
import { SETTINGS_CONSTANTS } from '../../config/constants';
import { RuleMigrationService } from 'src/core/RuleMigrationService';
import { MobileUtils } from '../../utils/MobileUtils';

export class ImportExportSettingsSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addImportExportSettings(): void {
    const isMobile = MobileUtils.isMobile();
    new Setting(this.containerEl).setName('Import/Export').setHeading();

    // Export Settings Button
    const exportSetting = new Setting(this.containerEl)
      .setName('Export settings')
      .setDesc('Export your current settings as a JSON file')
      .addButton(btn =>
        btn
          .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.EXPORT_SETTINGS)
          .setCta()
          .onClick(async () => {
            await this.exportSettings();
          })
      );

    // Add mobile optimization classes
    if (isMobile) {
      exportSetting.settingEl.addClass('noteMover-mobile-optimized');
      const controlEl = exportSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass('noteMover-mobile-button-control');
      }
    }

    // Import Settings Button
    const importSetting = new Setting(this.containerEl)
      .setName('Import settings')
      .setDesc('Import settings from a JSON file')
      .addButton(btn =>
        btn
          .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS)
          .setWarning()
          .onClick(async () => {
            await this.importSettings();
          })
      );

    // Add mobile optimization classes
    if (isMobile) {
      importSetting.settingEl.addClass('noteMover-mobile-optimized');
      const controlEl = importSetting.settingEl.querySelector(
        '.setting-item-control'
      );
      if (controlEl) {
        (controlEl as HTMLElement).addClass('noteMover-mobile-button-control');
      }
    }
  }

  private async exportSettings(): Promise<void> {
    try {
      // Build export object without history
      const settingsToExport: any = {
        settings: this.plugin.settings.settings,
        lastSeenVersion: this.plugin.settings.lastSeenVersion,
      };

      // schemaVersion is at root level
      if (this.plugin.settings.schemaVersion) {
        settingsToExport.schemaVersion = this.plugin.settings.schemaVersion;
      }

      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(settingsToExport, null, 2);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `note-mover-settings-${new Date().toISOString().split('T')[0]}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      // Show success message
      NoticeManager.info(SETTINGS_CONSTANTS.UI_TEXTS.EXPORT_SUCCESS);
    } catch (error) {
      handleError(
        createError(`Export failed: ${error.message}`),
        'Export settings',
        false
      );
    }
  }

  private async importSettings(): Promise<void> {
    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';

      // Add to DOM temporarily
      document.body.appendChild(input);

      // Handle file selection
      const file = await new Promise<File>((resolve, reject) => {
        input.onchange = e => {
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
      document.body.removeChild(input);

      // Read file content
      const fileContent = await this.readFileAsText(file);

      // Parse JSON
      let importedSettings: any;
      try {
        importedSettings = JSON.parse(fileContent);
      } catch (parseError) {
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
        if (
          importedSettings &&
          typeof importedSettings === 'object' &&
          importedSettings.settings &&
          typeof importedSettings.settings === 'object'
        ) {
          const s = importedSettings.settings;

          if (s.triggers && typeof s.triggers === 'object') {
            if (s.triggers.enablePeriodicMovement !== undefined) {
              current.settings.triggers.enablePeriodicMovement =
                !!s.triggers.enablePeriodicMovement;
            }
            if (s.triggers.periodicMovementInterval !== undefined) {
              current.settings.triggers.periodicMovementInterval = Number(
                s.triggers.periodicMovementInterval
              );
            }
            if (s.triggers.enableOnEditTrigger !== undefined) {
              current.settings.triggers.enableOnEditTrigger =
                !!s.triggers.enableOnEditTrigger;
            }
          }

          if (s.filters && typeof s.filters === 'object') {
            const arr = Array.isArray(s.filters.filter) ? s.filters.filter : [];
            current.settings.filters.filter = arr
              .filter((f: any) => f && typeof f.value === 'string')
              .map((f: any) => ({ value: String(f.value) }));
          }

          if (Array.isArray(s.rules)) {
            current.settings.rules = s.rules;
          }

          if (s.retentionPolicy) {
            current.settings.retentionPolicy = s.retentionPolicy;
          }

          if (importedSettings.lastSeenVersion !== undefined) {
            current.lastSeenVersion = importedSettings.lastSeenVersion;
          }

          // Import schemaVersion if present
          if (importedSettings.schemaVersion !== undefined) {
            current.schemaVersion = importedSettings.schemaVersion;
          }

          // Import enableRuleV2 flag if present
          if (s.enableRuleV2 !== undefined) {
            current.settings.enableRuleV2 = !!s.enableRuleV2;
          }

          // Import RuleV2 if present
          if (s.rulesV2 !== undefined) {
            current.settings.rulesV2 = s.rulesV2;
          }
        } else {
          // Legacy import path: sanitize and map into new structure
          const sanitizedSettings = SettingsValidator.sanitizeSettings(
            importedSettings
          ) as any;

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
              .filter((v: any) => typeof v === 'string')
              .map((v: string) => ({ value: v }));
          }
          if (Array.isArray(sanitizedSettings.rules)) {
            current.settings.rules = sanitizedSettings.rules;
          }
          if (sanitizedSettings.retentionPolicy) {
            current.settings.retentionPolicy =
              sanitizedSettings.retentionPolicy;
          }
          if (sanitizedSettings.lastSeenVersion !== undefined) {
            current.lastSeenVersion = sanitizedSettings.lastSeenVersion;
          }
        }

        // Migrate V1 rules to V2 if feature flag is enabled
        if (current.settings.enableRuleV2) {
          if (
            RuleMigrationService.shouldMigrate(
              current.settings.rules,
              current.settings.rulesV2
            )
          ) {
            console.log('Migrating imported Rule V1 to Rule V2...');
            current.settings.rulesV2 = RuleMigrationService.migrateRules(
              current.settings.rules
            );
            console.log(
              `Migrated ${current.settings.rulesV2.length} imported rules to V2 format`
            );
          }
        }

        // Save settings
        await this.plugin.save_settings();

        // Update RuleManager
        this.plugin.noteMover.updateRuleManager();

        // Refresh the settings display
        this.refreshDisplay();

        // Show success message
        NoticeManager.success(SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SUCCESS);
      }
    } catch (error) {
      if (error.message !== 'File selection cancelled') {
        handleError(
          createError(`Import failed: ${error.message}`),
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
