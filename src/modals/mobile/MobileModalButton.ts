import { MobileModalCard } from './MobileModalCard';

export interface MobileModalButtonOptions {
  isPrimary?: boolean;
  isWarning?: boolean;
  isDanger?: boolean;
}

/**
 * Mobile-optimized button component for modals
 */
export class MobileModalButton {
  private modalCard: MobileModalCard;
  private buttonEl: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    title: string,
    description: string | undefined,
    buttonText: string,
    onClick: () => void | Promise<void>,
    options: MobileModalButtonOptions = {}
  ) {
    this.modalCard = new MobileModalCard(container, title, description);
    this.modalCard.addClass('noteMover-mobile-modal-button');

    const contentEl = this.modalCard.getContentElement();

    // Create button
    this.buttonEl = contentEl.createEl('button', {
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
    return this.modalCard.getCardElement();
  }
}
