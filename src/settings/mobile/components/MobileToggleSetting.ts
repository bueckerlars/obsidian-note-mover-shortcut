import { MobileSettingItem } from './MobileSettingItem';

/**
 * Mobile-optimized toggle setting component
 */
export class MobileToggleSetting {
  private settingItem: MobileSettingItem;
  private toggleEl: HTMLElement;
  private toggleInput: HTMLInputElement;

  constructor(
    container: HTMLElement,
    title: string,
    description: string | undefined,
    value: boolean,
    onChange: (value: boolean) => void | Promise<void>
  ) {
    this.settingItem = new MobileSettingItem(container, title, description);
    this.settingItem.addClass('mobile-toggle-setting');

    const cardEl = this.settingItem.getCardElement();
    const headerEl = cardEl.querySelector(
      '.mobile-setting-header'
    ) as HTMLElement;

    if (!headerEl) {
      throw new Error('Header element not found');
    }

    // Create toggle switch directly in header (right side)
    this.toggleEl = headerEl.createDiv({ cls: 'mobile-toggle-switch' });
    this.toggleInput = document.createElement('input');
    this.toggleInput.type = 'checkbox';
    this.toggleInput.className = 'mobile-toggle-input';
    this.toggleInput.checked = value;
    this.toggleEl.appendChild(this.toggleInput);

    // Add visual toggle switch
    const toggleSlider = this.toggleEl.createDiv({
      cls: 'mobile-toggle-slider',
    });

    // Update visual state
    this.updateToggleState(value);

    // Add click handler
    this.toggleInput.addEventListener('change', async () => {
      const newValue = this.toggleInput.checked;
      this.updateToggleState(newValue);
      await onChange(newValue);
    });

    // Make entire toggle area clickable
    this.toggleEl.addEventListener('click', e => {
      if (e.target !== this.toggleInput) {
        this.toggleInput.click();
      }
    });

    // Hide the control element since toggle is in header
    const controlEl = this.settingItem.getControlElement();
    controlEl.style.display = 'none';
  }

  private updateToggleState(value: boolean): void {
    if (value) {
      this.toggleEl.addClass('is-active');
    } else {
      this.toggleEl.removeClass('is-active');
    }
  }

  setValue(value: boolean): void {
    this.toggleInput.checked = value;
    this.updateToggleState(value);
  }

  getValue(): boolean {
    return this.toggleInput.checked;
  }

  getCardElement(): HTMLElement {
    return this.settingItem.getCardElement();
  }
}
