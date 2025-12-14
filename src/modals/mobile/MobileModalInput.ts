import { MobileModalCard } from './MobileModalCard';

/**
 * Mobile-optimized input component for modals
 */
export class MobileModalInput {
  private modalCard: MobileModalCard;
  private inputEl: HTMLInputElement;

  constructor(
    container: HTMLElement,
    title: string,
    description: string | undefined,
    placeholder: string,
    value: string,
    onChange: (value: string) => void | Promise<void>
  ) {
    this.modalCard = new MobileModalCard(container, title, description);
    this.modalCard.addClass('noteMover-mobile-modal-input');

    const contentEl = this.modalCard.getContentElement();

    // Create input
    this.inputEl = contentEl.createEl('input', {
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
    return this.modalCard.getCardElement();
  }
}
