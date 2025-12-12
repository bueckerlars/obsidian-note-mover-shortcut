import { MobileSettingItem } from './MobileSettingItem';

/**
 * Mobile-optimized input setting component
 */
export class MobileInputSetting {
  private settingItem: MobileSettingItem;
  private inputEl: HTMLInputElement;

  constructor(
    container: HTMLElement,
    title: string,
    description: string | undefined,
    placeholder: string,
    value: string,
    onChange: (value: string) => void | Promise<void>
  ) {
    this.settingItem = new MobileSettingItem(container, title, description);
    this.settingItem.addClass('noteMover-mobile-input-setting');

    const controlEl = this.settingItem.getControlElement();

    // Create input
    this.inputEl = controlEl.createEl('input', {
      cls: 'noteMover-mobile-text-input',
      type: 'text',
      attr: {
        placeholder: placeholder,
        value: value,
      },
    });

    // Add change handler
    this.inputEl.addEventListener('input', async () => {
      await onChange(this.inputEl.value);
    });
  }

  setValue(value: string): void {
    this.inputEl.value = value;
  }

  getValue(): string {
    return this.inputEl.value;
  }

  getInputElement(): HTMLInputElement {
    return this.inputEl;
  }

  getCardElement(): HTMLElement {
    return this.settingItem.getCardElement();
  }
}
