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
import {
  replaceSettings,
  restoreSettingsBackup,
  SETTINGS_BACKUP_FILE,
  summarizeSettingsImport,
} from '../importBackup';
import { RuleMigrationService } from 'src/core/RuleMigrationService';
import { debugDebug } from '../../utils/debug';
import { createSettingGroup } from '../settingGroup';
import { formatDateTime } from '../../utils/formatDate';
import type { SectionContext } from '../pages';
import { applyRestoredSettings } from '../../application/restore-settings-backup';
import {
  loadSettingsImport,
  pickSettingsFile,
  runImportAction,
} from '../importSettings';

export class ImportExportSettingsSection {
  private readonly plugin: AdvancedNoteMoverPlugin;
  private readonly containerEl: HTMLElement;
  private readonly refreshDisplay: () => void;

  constructor(ctx: SectionContext) {
    this.plugin = ctx.plugin;
    this.containerEl = ctx.containerEl;
    this.refreshDisplay = ctx.refresh;
  }

  /** "Import and export" sub-page. */
  render(): void {
    const labels = strings().settings;
    const group = createSettingGroup(this.containerEl);

    group.addSetting(setting =>
      setting
        .setName(labels.importExportExportName)
        .setDesc(labels.importExportExportDesc)
        .addButton(btn => {
          btn.setButtonText(labels.importExportExportButton).onClick(() => {
            void (async () => {
              btn.setDisabled(true);
              try {
                await this.exportSettings();
              } finally {
                btn.setDisabled(false);
              }
            })();
          });
        })
    );

    group.addSetting(setting =>
      setting
        .setName(labels.importExportImportName)
        .setDesc(labels.importExportImportDesc)
        .addButton(btn => {
          btn.setButtonText(labels.importExportImportButton).onClick(() => {
            void runImportAction(
              disabled => btn.setDisabled(disabled),
              () => this.importSettings()
            );
          });
        })
    );

    group.addSetting(setting => {
      setting
        .setName(labels.importExportRestoreName)
        .setDesc(labels.importExportRestoreNone)
        .addButton(btn => {
          btn
            .setButtonText(labels.importExportRestoreButton)
            .setDisabled(true)
            .onClick(() => {
              void this.restoreBackup();
            });
          void this.backupDate().then(date => {
            if (date === null || !setting.settingEl.isConnected) {
              return;
            }
            setting.setDesc(
              fill(labels.importExportRestoreDesc, {
                date: formatDateTime(date),
              })
            );
            btn.setDisabled(false);
          });
        });
    });
  }

  private async backupDate(): Promise<number | null> {
    const stat = await this.plugin.app.vault.adapter.stat(
      this.settingsBackupPath()
    );
    return stat ? stat.mtime : null;
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
              this.plugin.triggerHandler.togglePeriodic();
              this.plugin.triggerHandler.toggleOnEditListener();
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
        writeCurrent: contents => applyRestoredSettings(this.plugin, contents),
      });
      if (restored === null) {
        NoticeManager.warning(strings().notices.importNoBackup);
        return;
      }
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
