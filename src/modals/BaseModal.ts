import { Modal, App, Setting, ButtonComponent } from 'obsidian';
import { MobileUtils } from '../utils/MobileUtils';

export type ModalSize = 'small' | 'medium' | 'large';

export interface BaseModalOptions {
  title?: string;
  titleIcon?: string;
  cssClass?: string;
  size?: ModalSize;
  autoFocus?: boolean;
  focusSelector?: string;
}

export abstract class BaseModal extends Modal {
  protected options: BaseModalOptions;

  constructor(app: App, options: BaseModalOptions = {}) {
    super(app);
    this.options = {
      autoFocus: true,
      focusSelector: '.mod-cta',
      ...options,
    };
  }

  onOpen() {
    const { contentEl } = this;
    this.clearContent();
    this.addCssClass();
    this.addMobileClasses();
    this.setModalSize();
    this.createTitle();
    this.createContent();
    this.setupAutoFocus();
    this.resetScrollPosition();
  }

  /**
   * Reset scroll position to top when modal opens
   */
  protected resetScrollPosition(): void {
    // Multiple attempts to ensure scroll is reset after DOM is fully rendered
    const resetScroll = () => {
      if (this.contentEl) {
        this.contentEl.scrollTop = 0;
      }
      const modalContainer = this.contentEl?.parentElement;
      if (modalContainer) {
        modalContainer.scrollTop = 0;
        // Also try scrolling the modal's parent if it exists
        const modalParent = modalContainer.parentElement;
        if (modalParent) {
          modalParent.scrollTop = 0;
        }
      }
    };

    // Immediate reset
    resetScroll();

    // Reset after animation frame
    requestAnimationFrame(() => {
      resetScroll();
      // Also reset after a short delay to catch any late rendering
      setTimeout(() => {
        resetScroll();
      }, 50);
    });
  }

  onClose() {
    this.clearContent();
  }

  /**
   * Clear the modal content
   */
  protected clearContent(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  /**
   * Add CSS class to the modal content
   */
  protected addCssClass(): void {
    const { contentEl } = this;
    if (this.options.cssClass) {
      contentEl.addClass(this.options.cssClass);
    }
  }

  /**
   * Add mobile-specific CSS classes to modal container and content
   */
  protected addMobileClasses(): void {
    const modalContainer = this.contentEl.parentElement;
    if (modalContainer) {
      MobileUtils.addMobileClass(modalContainer);
      MobileUtils.addMobileClass(this.contentEl);
    }
  }

  /**
   * Set modal size based on options using CSS classes
   */
  protected setModalSize(): void {
    const modalContainer = this.contentEl.parentElement;
    if (modalContainer && this.options.size) {
      // Remove any existing size classes
      modalContainer.classList.remove(
        'noteMover-modal-size-small',
        'noteMover-modal-size-medium',
        'noteMover-modal-size-large'
      );
      // On mobile, use full-width layout regardless of size option
      if (MobileUtils.isMobile()) {
        modalContainer.classList.add('noteMover-modal-size-mobile');
      } else {
        // Add the appropriate size class for desktop
        modalContainer.classList.add(
          `noteMover-modal-size-${this.options.size}`
        );
      }
    }
  }

  /**
   * Create modal title if provided
   */
  protected createTitle(): void {
    if (!this.options.title) return;

    const { contentEl } = this;

    if (this.options.titleIcon) {
      const titleContainer = contentEl.createEl('div', {
        cls: 'noteMover-modal-title-container',
      });
      const titleIcon = titleContainer.createEl('span', {
        cls: 'noteMover-modal-title-icon',
      });
      titleIcon.innerHTML = this.options.titleIcon;
      titleContainer.createEl('h2', {
        text: this.options.title,
        cls: 'noteMover-modal-title',
      });
    } else {
      contentEl.createEl('h2', {
        text: this.options.title,
        cls: 'noteMover-modal-title',
      });
    }
  }

  /**
   * Setup auto focus on specified element
   */
  protected setupAutoFocus(): void {
    if (!this.options.autoFocus || !this.options.focusSelector) return;

    setTimeout(() => {
      const focusElement = this.contentEl.querySelector(
        this.options.focusSelector!
      ) as HTMLElement;
      if (focusElement && typeof focusElement.focus === 'function') {
        focusElement.focus();
        // Reset scroll after focus, as focus can cause scrolling
        this.resetScrollPosition();
      }
    }, 10);
  }

  /**
   * Create a button container with consistent styling
   */
  protected createButtonContainer(
    container: HTMLElement,
    cssClass = 'noteMover-modal-button-container'
  ): HTMLElement {
    return container.createEl('div', { cls: cssClass });
  }

  /**
   * Create a button with consistent styling
   */
  protected createButton(
    container: HTMLElement,
    text: string,
    onClick: () => void,
    options: {
      isPrimary?: boolean;
      isWarning?: boolean;
      icon?: string;
      tooltip?: string;
    } = {}
  ): void {
    new Setting(container).addButton((btn: ButtonComponent) => {
      btn.setButtonText(text);
      if (options.icon) btn.setIcon(options.icon);
      if (options.tooltip) btn.setTooltip(options.tooltip);
      if (options.isWarning) btn.setWarning();
      if (options.isPrimary) btn.setCta();
      btn.onClick(onClick);
    });
  }

  /**
   * Create a section with consistent styling
   */
  protected createSection(
    container: HTMLElement,
    cssClass = 'noteMover-modal-section'
  ): HTMLElement {
    return container.createEl('div', { cls: cssClass });
  }

  /**
   * Abstract method that must be implemented by subclasses to create modal content
   */
  protected abstract createContent(): void;
}
