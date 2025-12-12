import { MobileSettingItem } from './MobileSettingItem';

export interface MobileButtonOptions {
  isPrimary?: boolean;
  isWarning?: boolean;
  isDanger?: boolean;
}

/**
 * Mobile-optimized button setting component
 */
export class MobileButtonSetting {
  private settingItem: MobileSettingItem;
  private buttonEl: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    title: string,
    description: string | undefined,
    buttonText: string,
    onClick: () => void | Promise<void>,
    options: MobileButtonOptions = {}
  ) {
    this.settingItem = new MobileSettingItem(container, title, description);
    this.settingItem.addClass('noteMover-mobile-button-setting');

    const controlEl = this.settingItem.getControlElement();

    // Create button
    this.buttonEl = controlEl.createEl('button', {
      cls: 'noteMover-mobile-action-btn',
      text: buttonText,
    });

    // Apply button type styles
    if (options.isPrimary) {
      this.buttonEl.addClass('mod-cta');
      this.buttonEl.style.background = 'var(--interactive-accent)';
      this.buttonEl.style.color = 'var(--text-on-accent)';
    } else if (options.isWarning || options.isDanger) {
      this.buttonEl.addClass('noteMover-mobile-delete-btn');
    }

    // Add click handler
    this.buttonEl.addEventListener('click', async () => {
      await onClick();
    });
  }

  setButtonText(text: string): void {
    this.buttonEl.textContent = text;
  }

  getButtonElement(): HTMLButtonElement {
    return this.buttonEl;
  }

  getCardElement(): HTMLElement {
    return this.settingItem.getCardElement();
  }
}
