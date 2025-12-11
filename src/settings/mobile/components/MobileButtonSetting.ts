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

    // Apply button styles
    this.buttonEl.style.width = '100%';
    this.buttonEl.style.minHeight = '48px';
    this.buttonEl.style.padding = '12px';
    this.buttonEl.style.fontSize = '16px';
    this.buttonEl.style.borderRadius = '6px';
    this.buttonEl.style.border = 'none';
    this.buttonEl.style.cursor = 'pointer';
    this.buttonEl.style.fontWeight = '500';

    // Apply button type styles
    if (options.isPrimary) {
      this.buttonEl.addClass('mod-cta');
      this.buttonEl.style.background = 'var(--interactive-accent)';
      this.buttonEl.style.color = 'var(--text-on-accent)';
    } else if (options.isWarning || options.isDanger) {
      this.buttonEl.addClass('mod-warning');
      this.buttonEl.style.background = 'var(--background-modifier-error)';
      this.buttonEl.style.color = 'var(--text-on-accent)';
    } else {
      this.buttonEl.style.background = 'var(--background-modifier-form-field)';
      this.buttonEl.style.color = 'var(--text-normal)';
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
