import AdvancedNoteMoverPlugin from 'main';
import type { App } from 'obsidian';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { HISTORY_CONSTANTS } from '../../config/constants';
import { fill, strings } from '../../i18n/locale';
import { renderSetting } from '../settingDefinitions';

export class HistorySettingsSection {
  constructor(
    private plugin: AdvancedNoteMoverPlugin,
    private containerEl: HTMLElement
  ) {}

  addHistorySettings(): void {
    renderSetting(this.containerEl, 'history.heading');

    // Retention Policy Settings
    this.addRetentionPolicySettings();

    // Clear History Button
    renderSetting(this.containerEl, 'history.clear').addButton(btn => {
      btn.setButtonText(strings().settings.historyClearButton);
      btn.buttonEl.addClass('mod-warning');
      btn.onClick(async () => {
        const confirmed = await ConfirmModal.show(this.app, {
          title: strings().settings.historyClearTitle,
          message: strings().settings.historyClearMessage,
          confirmText: strings().settings.historyClearConfirm,
          cancelText: strings().common.cancel,
          danger: true,
        });

        if (confirmed) {
          await this.plugin.historyManager.clearHistory();
        }
      });
    });
  }

  private addRetentionPolicySettings(): void {
    if (!this.plugin.pluginData.settings.retentionPolicy) {
      this.plugin.pluginData.settings.retentionPolicy = {
        ...HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY,
      };
    }

    const retentionPolicy = this.plugin.pluginData.settings.retentionPolicy;

    // Retention Policy Section - Single line with value input and unit dropdown
    const retentionSetting = renderSetting(
      this.containerEl,
      'history.retention'
    )
      .addText(text =>
        text
          .setPlaceholder(strings().settings.historyRetentionPlaceholder)
          .setValue(retentionPolicy.value.toString())
          .onChange(async (value: string) => {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              this.plugin.pluginData.settings.retentionPolicy.value = numValue;
              await this.plugin.save_settings();
            }
          })
      )
      .addDropdown(dropdown =>
        dropdown
          .addOption('days', strings().settings.historyDays)
          .addOption('weeks', strings().settings.historyWeeks)
          .addOption('months', strings().settings.historyMonths)
          .setValue(retentionPolicy.unit)
          .onChange(async (value: string) => {
            this.plugin.pluginData.settings.retentionPolicy.unit = value as
              'days' | 'weeks' | 'months';
            await this.plugin.save_settings();
          })
      );

    retentionSetting.setClass('advancedNoteMover-setting-stack');

    renderSetting(this.containerEl, 'history.cleanup')
      .setDesc(
        fill(strings().settings.historyCleanupDesc, {
          value: retentionPolicy.value,
          unit: retentionPolicy.unit,
        })
      )
      .addButton(btn =>
        btn
          .setButtonText(strings().settings.historyCleanupButton)
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
