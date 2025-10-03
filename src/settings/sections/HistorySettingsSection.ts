import NoteMoverShortcutPlugin from 'main';
import { App, Setting } from 'obsidian';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { SETTINGS_CONSTANTS, HISTORY_CONSTANTS } from '../../config/constants';
import { RetentionPolicy } from '../../types/HistoryEntry';

export class HistorySettingsSection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement
  ) {}

  addHistorySettings(): void {
    new Setting(this.containerEl).setName('History').setHeading();

    // Retention Policy Settings
    this.addRetentionPolicySettings();

    // Clear History Button
    new Setting(this.containerEl)
      .setName('Clear history')
      .setDesc('Clears the history of moved notes')
      .addButton(btn =>
        btn
          .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY)
          .setWarning()
          .onClick(async () => {
            const confirmed = await ConfirmModal.show(this.app, {
              title: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_TITLE,
              message: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_MESSAGE,
              confirmText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CONFIRM,
              cancelText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CANCEL,
              danger: true,
            });

            if (confirmed) {
              await this.plugin.historyManager.clearHistory();
            }
          })
      );
  }

  private addRetentionPolicySettings(): void {
    // Initialize retention policy if not set
    if (!this.plugin.settings.settings.retentionPolicy) {
      this.plugin.settings.settings.retentionPolicy = {
        ...HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY,
      } as RetentionPolicy;
    }

    const retentionPolicy = this.plugin.settings.settings.retentionPolicy;

    // Retention Policy Section - Single line with value input and unit dropdown
    new Setting(this.containerEl)
      .setName(SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_TITLE)
      .setDesc(SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_DESC)
      .addText(text =>
        text
          .setPlaceholder('30')
          .setValue(retentionPolicy.value.toString())
          .onChange(async (value: string) => {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              this.plugin.settings.settings.retentionPolicy!.value = numValue;
              await (this.plugin as any).save_settings();
            }
          })
      )
      .addDropdown(dropdown =>
        dropdown
          .addOption('days', SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_DAYS)
          .addOption(
            'weeks',
            SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_WEEKS
          )
          .addOption(
            'months',
            SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_MONTHS
          )
          .setValue(retentionPolicy.unit)
          .onChange(async (value: string) => {
            this.plugin.settings.settings.retentionPolicy!.unit = value as
              | 'days'
              | 'weeks'
              | 'months';
            await (this.plugin as any).save_settings();
          })
      );

    // Cleanup button
    new Setting(this.containerEl)
      .setName('Clean up old entries')
      .setDesc(
        `Remove history entries older than ${retentionPolicy.value} ${retentionPolicy.unit}`
      )
      .addButton(btn =>
        btn
          .setButtonText('Clean up now')
          .setCta()
          .onClick(async () => {
            await this.plugin.historyManager.cleanupOldEntries();
          })
      );
  }

  private get app(): App {
    return this.plugin.app;
  }
}
