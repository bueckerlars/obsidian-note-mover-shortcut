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
      cls: 'mobile-section-heading',
    });
    heading.textContent = 'History';
    heading.style.fontSize = '1.2em';
    heading.style.fontWeight = '600';
    heading.style.marginBottom = '12px';
    heading.style.marginTop = '16px';

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
      cls: 'mobile-setting-card',
    });
    policyCard.style.padding = '12px';
    policyCard.style.marginBottom = '12px';

    // Title
    const title = policyCard.createDiv({
      cls: 'mobile-setting-title',
      text: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_TITLE,
    });
    title.style.marginBottom = '8px';

    // Description
    const desc = policyCard.createDiv({
      cls: 'mobile-setting-description',
      text: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_DESC,
    });
    desc.style.marginBottom = '12px';

    // Value and Unit container
    const controlsContainer = policyCard.createDiv({
      cls: 'mobile-retention-controls',
    });
    controlsContainer.style.display = 'flex';
    controlsContainer.style.flexDirection = 'column';
    controlsContainer.style.gap = '8px';

    // Value input
    const valueInput = controlsContainer.createEl('input', {
      type: 'text',
      attr: {
        placeholder: '30',
        value: retentionPolicy.value.toString(),
      },
    });
    valueInput.style.width = '100%';
    valueInput.style.minHeight = '48px';
    valueInput.style.fontSize = '16px';
    valueInput.style.padding = '12px';
    valueInput.style.boxSizing = 'border-box';

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
      cls: 'mobile-dropdown',
    });
    unitSelect.style.width = '100%';
    unitSelect.style.minHeight = '48px';
    unitSelect.style.fontSize = '16px';
    unitSelect.style.padding = '12px';
    unitSelect.style.boxSizing = 'border-box';

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
