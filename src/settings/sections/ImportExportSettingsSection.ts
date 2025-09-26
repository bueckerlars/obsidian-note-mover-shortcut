import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { createError, handleError } from 'src/utils/Error';
import { NoticeManager } from 'src/utils/NoticeManager';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { SettingsValidator } from 'src/utils/SettingsValidator';
import { SETTINGS_CONSTANTS } from '../../config/constants';

export class ImportExportSettingsSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addImportExportSettings(): void {
    new Setting(this.containerEl).setName('Import/Export').setHeading();

    // Export Settings Button
    new Setting(this.containerEl)
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

    // Import Settings Button
    new Setting(this.containerEl)
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
  }

  private async exportSettings(): Promise<void> {
    try {
      // Create a clean copy of settings for export, excluding history
      const settingsToExport = { ...this.plugin.settings };

      // Remove history-related fields from export
      delete settingsToExport.history;
      delete settingsToExport.bulkOperations;

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
        // Sanitize and apply settings
        const sanitizedSettings =
          SettingsValidator.sanitizeSettings(importedSettings);

        // Merge with current settings (preserve some fields if needed)
        this.plugin.settings = {
          ...this.plugin.settings,
          ...sanitizedSettings,
        };

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
