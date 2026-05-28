import { Modal, App, setIcon } from 'obsidian';
import { MobileUtils } from '../utils/MobileUtils';

export type ModalSize = 'small' | 'medium' | 'large';

/** Inline dimensions override Obsidian core modal width rules (which use !important). */
const MODAL_SIZE_DIMENSIONS: Record<
  ModalSize,
  { width: string; minWidth: string; maxWidth?: string }
> = {
  small: { width: '400px', minWidth: '350px' },
  medium: { width: '800px', minWidth: '600px', maxWidth: '95vw' },
  large: { width: '900px', minWidth: '700px', maxWidth: '95vw' },
};

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
      const modalContainer = this.modalEl;
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
    this.clearModalSizeStyles();
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
    if (this.modalEl) {
      MobileUtils.addMobileClass(this.modalEl);
      MobileUtils.addMobileClass(this.contentEl);
    }
  }

  /**
   * Set modal size based on options using CSS classes
   */
  protected setModalSize(): void {
    const modalContainer = this.modalEl;
    if (!modalContainer || !this.options.size) {
      return;
    }

    this.clearModalSizeStyles();

    // On mobile, use full-width layout regardless of size option
    if (MobileUtils.isMobile()) {
      modalContainer.classList.add('advancedNoteMover-modal-size-mobile');
      modalContainer.style.setProperty('width', '100%', 'important');
      modalContainer.style.setProperty('max-width', '100%', 'important');
      modalContainer.style.setProperty('margin', '0', 'important');
      modalContainer.style.setProperty('border-radius', '0', 'important');
      modalContainer.style.setProperty('max-height', '100vh', 'important');
      modalContainer.style.setProperty('height', '100vh', 'important');
      return;
    }

    const size = this.options.size;
    modalContainer.classList.add(`advancedNoteMover-modal-size-${size}`);

    const dimensions = MODAL_SIZE_DIMENSIONS[size];
    modalContainer.style.setProperty('width', dimensions.width, 'important');
    modalContainer.style.setProperty(
      'min-width',
      dimensions.minWidth,
      'important'
    );
    if (dimensions.maxWidth) {
      modalContainer.style.setProperty(
        'max-width',
        dimensions.maxWidth,
        'important'
      );
    }
  }

  /**
   * Remove size classes and inline overrides from the modal shell
   */
  protected clearModalSizeStyles(): void {
    const modalContainer = this.modalEl;
    if (!modalContainer) {
      return;
    }

    modalContainer.classList.remove(
      'advancedNoteMover-modal-size-small',
      'advancedNoteMover-modal-size-medium',
      'advancedNoteMover-modal-size-large',
      'advancedNoteMover-modal-size-mobile'
    );
    modalContainer.style.removeProperty('width');
    modalContainer.style.removeProperty('min-width');
    modalContainer.style.removeProperty('max-width');
    modalContainer.style.removeProperty('margin');
    modalContainer.style.removeProperty('border-radius');
    modalContainer.style.removeProperty('max-height');
    modalContainer.style.removeProperty('height');
  }

  /**
   * Create modal title if provided
   */
  protected createTitle(): void {
    if (!this.options.title) return;

    const { contentEl } = this;

    if (this.options.titleIcon) {
      const titleContainer = contentEl.createEl('div', {
        cls: 'advancedNoteMover-modal-title-container',
      });
      const titleIcon = titleContainer.createEl('span', {
        cls: 'advancedNoteMover-modal-title-icon',
      });
      titleIcon.innerHTML = this.options.titleIcon;
      titleContainer.createEl('h2', {
        text: this.options.title,
        cls: 'advancedNoteMover-modal-title',
      });
    } else {
      contentEl.createEl('h2', {
        text: this.options.title,
        cls: 'advancedNoteMover-modal-title',
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
    cssClass = 'advancedNoteMover-modal-button-container'
  ): HTMLElement {
    return container.createEl('div', { cls: cssClass });
  }

  /**
   * Create a footer/action button (plain mod-button, not wrapped in Setting)
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
  ): HTMLButtonElement {
    const button = container.createEl('button', { text, cls: 'mod-button' });
    if (options.isPrimary) {
      button.addClass('mod-cta');
    }
    if (options.isWarning) {
      button.addClass('mod-warning');
    }
    if (options.icon) {
      button.empty();
      setIcon(button, options.icon);
    }
    if (options.tooltip) {
      button.setAttr('aria-label', options.tooltip);
    }
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Create a section with consistent styling
   */
  protected createSection(
    container: HTMLElement,
    cssClass = 'advancedNoteMover-modal-section'
  ): HTMLElement {
    return container.createEl('div', { cls: cssClass });
  }

  /**
   * Abstract method that must be implemented by subclasses to create modal content
   */
  protected abstract createContent(): void;
}
