import AdvancedNoteMoverPlugin from 'main';
import { normalizePath, type App } from 'obsidian';
import type { PluginData, SettingsData } from '../../types/PluginData';
import type { RetentionPolicy } from '../../types/HistoryEntry';
import type { LegacyRuleV1 } from '../../core/RuleMigrationService';
import type { LegacySettingsFields } from '../../infrastructure/persistence/plugin-settings-controller';
import { createError, handleError } from 'src/utils/Error';
import { NoticeManager } from 'src/utils/NoticeManager';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { SettingsValidator } from 'src/utils/SettingsValidator';
import { fill, plural, strings } from '../../i18n/locale';
import { looksLikePluginDataRoot } from '../../infrastructure/persistence/plugin-settings-schema';
import {
  replaceSettings,
  restoreSettingsBackup,
  SETTINGS_BACKUP_FILE,
  summarizeSettingsImport,
} from '../importBackup';
import { RuleMigrationService } from 'src/core/RuleMigrationService';
import { debugDebug } from '../../utils/debug';
import { renderSetting } from '../settingDefinitions';
import {
  loadSettingsImport,
  pickSettingsFile,
  runImportAction,
} from '../importSettings';

export class ImportExportSettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement,
    private refreshDisplay: () => void
  ) {}

  addImportExportSettings(): void {
    renderSetting(this.containerEl, 'importExport.heading');

    renderSetting(this.containerEl, 'importExport.export').addButton(btn => {
      btn
        .setButtonText(strings().settings.importExportExportButton)
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

    renderSetting(this.containerEl, 'importExport.import').addButton(btn => {
      btn
        .setButtonText(strings().settings.importExportImportButton)
        .onClick(() => {
          void runImportAction(
            disabled => btn.setDisabled(disabled),
            () => this.importSettings()
          );
        });
    });

    renderSetting(this.containerEl, 'importExport.restore').addButton(btn => {
      btn
        .setButtonText(strings().settings.importExportRestoreButton)
        .onClick(() => {
          void this.restoreBackup();
        });
    });
  }

  async exportSettings(): Promise<void> {
    try {
      // Build export object without history
      const settingsToExport: Partial<PluginData> = {
        settings: this.plugin.pluginData.settings,
        lastSeenVersion: this.plugin.pluginData.lastSeenVersion,
        schemaVersion: this.plugin.pluginData.schemaVersion,
      };

      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(settingsToExport, null, 2);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = createEl('a');
      link.href = url;
      link.download = `note-mover-settings-${new Date().toISOString().split('T')[0]}.json`;

      // Trigger download
      activeDocument.body.appendChild(link);
      link.click();
      activeDocument.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      // Show success message
      NoticeManager.info(strings().notices.exportSuccess);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      handleError(
        createError(`Export failed: ${msg}`),
        'Export settings',
        false
      );
    }
  }

  async importSettings(): Promise<void> {
    try {
      const file = await pickSettingsFile(activeDocument, activeWindow);
      if (!file) {
        return;
      }

      const fileContent = await this.readFileAsText(file);
      const loaded = await loadSettingsImport(
        fileContent,
        async importedSettings => {
          // Validate settings
          const validation =
            SettingsValidator.validateSettings(importedSettings);

          if (!validation.isValid) {
            const errorMessage = `${strings().notices.validationErrors}:\n${validation.errors.join('\n')}`;
            handleError(createError(errorMessage), 'Import settings', false);
            return;
          }

          // Show warnings if any
          if (validation.warnings.length > 0) {
            NoticeManager.warning(
              `Import warnings: ${validation.warnings.join(', ')}`
            );
          }

          const currentSnapshot = JSON.stringify(this.plugin.pluginData);
          const summary = summarizeSettingsImport(importedSettings);
          await replaceSettings({
            current: currentSnapshot,
            summary,
            confirm: importSummary =>
              ConfirmModal.show(this.app, {
                title: strings().settings.importExportImportTitle,
                message: fill(strings().settings.importExportImportMessage, {
                  rules: plural(importSummary.rules, 'rule'),
                  filters: plural(importSummary.filters, 'filter'),
                }),
                confirmText: strings().settings.importExportImportConfirm,
                cancelText: strings().common.cancel,
              }),
            writeBackup: contents => this.writeSettingsBackup(contents),
            backupExists: () => this.settingsBackupExists(),
            apply: () => {
              this.applyImportedSettings(importedSettings);
            },
            save: async () => {
              await this.plugin.save_settings();
              this.plugin.advancedNoteMover.updateRuleManager();
              this.refreshDisplay();
              NoticeManager.success(strings().notices.importSuccess);
            },
          });
        }
      );
      if (!loaded.applied) {
        handleError(
          createError(loaded.error ?? strings().notices.invalidFile),
          'Import settings',
          false
        );
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

  private applyImportedSettings(importedSettings: unknown): void {
    const current = this.plugin.pluginData;

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
        current.settings.retentionPolicy = s.retentionPolicy as RetentionPolicy;
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
      debugDebug('Migrating imported Rule V1 to Rule V2...');
      current.settings.rulesV2 = RuleMigrationService.migrateRules(legacyRules);
      (current.settings as SettingsData & LegacySettingsFields).rules = [];
      debugDebug(
        `Migrated ${(current.settings.rulesV2 ?? []).length} imported rules to V2 format`
      );
    }
  }

  private settingsBackupPath(): string {
    const { configDir } = this.plugin.app.vault;
    return normalizePath(
      `${configDir}/plugins/${this.plugin.manifest.id}/${SETTINGS_BACKUP_FILE}`
    );
  }

  private async writeSettingsBackup(contents: string): Promise<void> {
    await this.plugin.app.vault.adapter.write(
      this.settingsBackupPath(),
      contents
    );
  }

  private async settingsBackupExists(): Promise<boolean> {
    return this.plugin.app.vault.adapter.exists(this.settingsBackupPath());
  }

  async restoreBackup(): Promise<void> {
    try {
      const path = this.settingsBackupPath();
      if (!(await this.plugin.app.vault.adapter.exists(path))) {
        NoticeManager.warning(strings().notices.importNoBackup);
        return;
      }
      const confirmed = await ConfirmModal.show(this.app, {
        title: strings().settings.importExportRestoreTitle,
        message: strings().settings.importExportRestoreMessage,
        confirmText: strings().settings.importExportRestoreButton,
        cancelText: strings().common.cancel,
      });
      if (!confirmed) {
        return;
      }
      const restored = await restoreSettingsBackup({
        readBackup: () => this.plugin.app.vault.adapter.read(path),
        writeCurrent: async contents => {
          const parsed: unknown = JSON.parse(contents);
          if (!looksLikePluginDataRoot(parsed)) {
            throw createError(strings().notices.importBackupInvalid);
          }
          this.plugin.pluginData = parsed as PluginData;
          await this.plugin.save_settings();
        },
      });
      if (restored === null) {
        NoticeManager.warning(strings().notices.importNoBackup);
        return;
      }
      this.plugin.advancedNoteMover.updateRuleManager();
      this.refreshDisplay();
      NoticeManager.success(strings().notices.importRestored);
    } catch (error) {
      handleError(error, strings().notices.importSettingsContext, false);
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
