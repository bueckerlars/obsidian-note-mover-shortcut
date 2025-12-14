import NoteMoverShortcutPlugin from 'main';
import { MobileButtonSetting } from '../components/MobileButtonSetting';
import { SETTINGS_CONSTANTS } from '../../../config/constants';
import { SettingsValidator } from '../../../utils/SettingsValidator';
import { RuleMigrationService } from '../../../core/RuleMigrationService';
import { createError, handleError } from '../../../utils/Error';
import { NoticeManager } from '../../../utils/NoticeManager';

/**
 * Mobile-optimized import/export section
 */
export class MobileImportExportSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement
  ) {}

  render(): void {
    // Section heading
    const heading = this.containerEl.createDiv({
      cls: 'noteMover-mobile-section-heading',
    });
    heading.textContent = 'Import/Export';

    // Export Settings Button
    new MobileButtonSetting(
      this.containerEl,
      'Export settings',
      'Export your current settings as a JSON file',
      SETTINGS_CONSTANTS.UI_TEXTS.EXPORT_SETTINGS,
      async () => {
        await this.exportSettings();
      },
      { isPrimary: true }
    );

    // Import Settings Button - Ensure it's always visible
    new MobileButtonSetting(
      this.containerEl,
      'Import settings',
      'Import settings from a JSON file',
      SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS,
      async () => {
        await this.importSettings();
      },
      { isWarning: true }
    );
  }

  private async exportSettings(): Promise<void> {
    try {
      // Build export object without history
      const settingsToExport: any = {
        triggers: this.plugin.settings.settings.triggers,
        filters: this.plugin.settings.settings.filters,
        rules: this.plugin.settings.settings.rules,
        rulesV2: this.plugin.settings.settings.rulesV2,
        enableRuleV2: this.plugin.settings.settings.enableRuleV2,
        retentionPolicy: this.plugin.settings.settings.retentionPolicy,
      };

      const jsonString = JSON.stringify(settingsToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `note-mover-settings-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      NoticeManager.success('Settings exported successfully');
    } catch (error) {
      handleError(
        createError('Failed to export settings', error),
        'Export settings',
        false
      );
    }
  }

  private async importSettings(): Promise<void> {
    try {
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';

      input.addEventListener('change', async e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          const importedSettings = JSON.parse(text);

          // Validate imported settings
          const validationResult =
            SettingsValidator.validateSettings(importedSettings);
          if (!validationResult.isValid) {
            NoticeManager.error(
              `Invalid settings file: ${validationResult.errors.join(', ')}`
            );
            return;
          }

          // Show confirmation
          const confirmed = confirm(
            'Import settings will replace your current settings. Continue?'
          );
          if (!confirmed) return;

          // Migrate rules if needed
          if (importedSettings.rules && !importedSettings.rulesV2) {
            importedSettings.rulesV2 = RuleMigrationService.migrateRules(
              importedSettings.rules
            );
          }

          // Import settings
          this.plugin.settings.settings.triggers =
            importedSettings.triggers || this.plugin.settings.settings.triggers;
          this.plugin.settings.settings.filters =
            importedSettings.filters || this.plugin.settings.settings.filters;
          this.plugin.settings.settings.rules =
            importedSettings.rules || this.plugin.settings.settings.rules;
          this.plugin.settings.settings.rulesV2 =
            importedSettings.rulesV2 || this.plugin.settings.settings.rulesV2;
          this.plugin.settings.settings.enableRuleV2 =
            importedSettings.enableRuleV2 ?? false;
          this.plugin.settings.settings.retentionPolicy =
            importedSettings.retentionPolicy ||
            this.plugin.settings.settings.retentionPolicy;

          await this.plugin.save_settings();
          this.plugin.noteMover.updateRuleManager();

          NoticeManager.success('Settings imported successfully');
        } catch (error) {
          handleError(
            createError('Failed to import settings', error),
            'Import settings',
            false
          );
        } finally {
          document.body.removeChild(input);
        }
      });

      document.body.appendChild(input);
      input.click();
    } catch (error) {
      handleError(
        createError('Failed to open file picker', error),
        'Import settings',
        false
      );
    }
  }
}
