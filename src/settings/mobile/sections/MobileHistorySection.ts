import NoteMoverShortcutPlugin from 'main';
import { MobileButtonSetting } from '../components/MobileButtonSetting';
import { MobileInputSetting } from '../components/MobileInputSetting';
import { ConfirmModal } from '../../../modals/ConfirmModal';
import {
  SETTINGS_CONSTANTS,
  HISTORY_CONSTANTS,
} from '../../../config/constants';
import { RetentionPolicy } from '../../../types/HistoryEntry';

/**
 * Mobile-optimized history section
 */
export class MobileHistorySection {
  constructor(
    private plugin: NoteMoverShortcutPlugin,
    private containerEl: HTMLElement
  ) {}

  render(): void {
    // Section heading
    const heading = this.containerEl.createDiv({
      cls: 'noteMover-mobile-section-heading',
    });
    heading.textContent = 'History';

    // Retention Policy
    this.renderRetentionPolicy();

    // Clean up old entries button
    const retentionPolicy = this.plugin.settings.settings.retentionPolicy || {
      ...HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY,
    };

    new MobileButtonSetting(
      this.containerEl,
      'Clean up old entries',
      `Remove entries older than ${retentionPolicy.value} ${retentionPolicy.unit}`,
      'Clean up now',
      async () => {
        await this.plugin.historyManager.cleanupOldEntries();
      },
      { isPrimary: true }
    );

    // Clear history button
    new MobileButtonSetting(
      this.containerEl,
      'Clear history',
      'Clears the history of moved notes',
      SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY,
      async () => {
        const confirmed = await ConfirmModal.show(this.plugin.app, {
          title: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_TITLE,
          message: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_MESSAGE,
          confirmText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CONFIRM,
          cancelText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CANCEL,
          danger: true,
        });

        if (confirmed) {
          await this.plugin.historyManager.clearHistory();
        }
      },
      { isWarning: true }
    );
  }

  private renderRetentionPolicy(): void {
    // Initialize retention policy if not set
    if (!this.plugin.settings.settings.retentionPolicy) {
      this.plugin.settings.settings.retentionPolicy = {
        ...HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY,
      } as RetentionPolicy;
    }

    const retentionPolicy = this.plugin.settings.settings.retentionPolicy;

    // Retention Policy Card
    const policyCard = this.containerEl.createDiv({
      cls: 'noteMover-mobile-setting-card',
    });

    // Title
    const title = policyCard.createDiv({
      cls: 'noteMover-mobile-setting-title',
      text: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_TITLE,
    });

    // Description
    const desc = policyCard.createDiv({
      cls: 'noteMover-mobile-setting-description',
      text: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_DESC,
    });

    // Value and Unit container
    const controlsContainer = policyCard.createDiv({
      cls: 'noteMover-mobile-retention-controls',
    });

    // Value input
    const valueInput = controlsContainer.createEl('input', {
      type: 'text',
      cls: 'noteMover-mobile-text-input',
      attr: {
        placeholder: '30',
        value: retentionPolicy.value.toString(),
      },
    });

    valueInput.addEventListener('input', async () => {
      const numValue = parseInt(valueInput.value);
      if (!isNaN(numValue) && numValue > 0) {
        this.plugin.settings.settings.retentionPolicy!.value = numValue;
        await (this.plugin as any).save_settings();
        // Update description
        desc.textContent = `Remove entries older than ${numValue} ${retentionPolicy.unit}`;
      }
    });

    // Unit dropdown
    const unitSelect = controlsContainer.createEl('select', {
      cls: 'noteMover-mobile-dropdown',
    });

    const daysOption = unitSelect.createEl('option', {
      text: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_DAYS,
      attr: { value: 'days' },
    });
    const weeksOption = unitSelect.createEl('option', {
      text: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_WEEKS,
      attr: { value: 'weeks' },
    });
    const monthsOption = unitSelect.createEl('option', {
      text: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_MONTHS,
      attr: { value: 'months' },
    });

    unitSelect.value = retentionPolicy.unit;

    unitSelect.addEventListener('change', async () => {
      this.plugin.settings.settings.retentionPolicy!.unit = unitSelect.value as
        | 'days'
        | 'weeks'
        | 'months';
      await (this.plugin as any).save_settings();
      // Update description
      desc.textContent = `Remove entries older than ${retentionPolicy.value} ${unitSelect.value}`;
    });
  }
}
