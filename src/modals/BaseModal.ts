import { Modal, App, setIcon, setTooltip } from 'obsidian';
import { MobileUtils } from '../utils/MobileUtils';
import { viewFrame, viewTimeout } from '../utils/viewTimers';

export type ModalSize = 'small' | 'medium' | 'large';

export interface BaseModalOptions {
  title?: string;
  titleIcon?: string;
  /** Render the title in Obsidian's native modal header (`titleEl`) instead of the content. */
  useNativeTitle?: boolean;
  cssClass?: string;
  /** Class added to `modalEl` on mobile; switches the shell to a full-height flex column. */
  mobileShellClass?: string;
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
    viewFrame(() => {
      resetScroll();
      // Also reset after a short delay to catch any late rendering
      viewTimeout(() => {
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

  protected setModalSize(): void {
    const modalContainer = this.modalEl;
    if (!modalContainer || !this.options.size) {
      return;
    }

    this.clearModalSizeStyles();

    if (MobileUtils.isMobile()) {
      modalContainer.classList.add('advancedNoteMover-modal-size-mobile');
      if (this.options.mobileShellClass) {
        modalContainer.classList.add(this.options.mobileShellClass);
      }
      return;
    }

    modalContainer.classList.add(
      `advancedNoteMover-modal-size-${this.options.size}`
    );
  }

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
    if (this.options.mobileShellClass) {
      modalContainer.classList.remove(this.options.mobileShellClass);
    }
  }

  /**
   * Create modal title if provided
   */
  protected createTitle(): void {
    if (!this.options.title) return;

    if (this.options.useNativeTitle) {
      this.setTitle(this.options.title);
      return;
    }

    const { contentEl } = this;

    if (this.options.titleIcon) {
      const titleContainer = contentEl.createDiv({
        cls: 'advancedNoteMover-modal-title-container',
      });
      const titleIcon = titleContainer.createSpan({
        cls: 'advancedNoteMover-modal-title-icon',
      });
      titleIcon.textContent = this.options.titleIcon;
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

    viewTimeout(() => {
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
    return container.createDiv({ cls: cssClass });
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
      setTooltip(button, options.tooltip);
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
    return container.createDiv({ cls: cssClass });
  }

  /**
   * Abstract method that must be implemented by subclasses to create modal content
   */
  protected abstract createContent(): void;
}
