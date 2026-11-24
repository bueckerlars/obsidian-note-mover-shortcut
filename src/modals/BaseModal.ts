import { Modal, App, setIcon, setTooltip } from 'obsidian';
import { associateSettingLabels } from '../domain/a11y/associateSettingLabels';
import { strings } from '../i18n/locale';
import { MobileUtils } from '../utils/MobileUtils';
import { viewFrame, viewTimeout } from '../utils/viewTimers';

export type ModalSize = 'small' | 'medium' | 'large';

export interface BaseModalOptions {
  title?: string;
  titleIcon?: string;
  /** Render the title in Obsidian's native modal header (`titleEl`) instead of the content. */
  useNativeTitle?: boolean;
  cssClass?: string;
  /** Phone: the dialog fills the screen below the title. */
  phoneFullscreen?: boolean;
  /** Class added to `modalEl` on mobile; switches the shell to a full-height flex column. */
  mobileShellClass?: string;
  size?: ModalSize;
  autoFocus?: boolean;
  focusSelector?: string;
}

export abstract class BaseModal extends Modal {
  protected options: BaseModalOptions;
  private opener: HTMLElement | null = null;
  private alive = false;
  private closed = false;
  private readonly onEscapeKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  };

  constructor(app: App, options: BaseModalOptions = {}) {
    super(app);
    this.options = {
      autoFocus: true,
      focusSelector: '.mod-cta',
      ...options,
    };
  }

  onOpen() {
    this.closed = false;
    this.alive = true;
    this.rememberOpener();
    this.clearContent();
    this.addCssClass();
    this.modalEl?.addClass('advancedNoteMover-focus-scope');
    if (this.options.phoneFullscreen) {
      this.modalEl?.addClass('advancedNoteMover-modal-fullscreen');
    }
    this.addMobileClasses();
    this.setModalSize();
    this.createTitle();
    this.labelCloseButton();
    this.createContent();
    associateSettingLabels(this.contentEl);
    this.modalEl?.addEventListener('keydown', this.onEscapeKey, true);
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
    this.alive = false;
    this.modalEl?.removeEventListener('keydown', this.onEscapeKey, true);
    this.clearModalSizeStyles();
    this.clearContent();
    const opener = this.opener;
    this.opener = null;
    if (opener?.isConnected) {
      opener.focus();
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.alive = false;
    super.close();
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
    contentEl.addClass('advancedNoteMover-modal');
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
  protected labelCloseButton(): void {
    const closeButton =
      this.modalEl?.querySelector('.modal-close-button') ?? null;
    if (!isHtmlElement(closeButton)) return;
    if (!closeButton.getAttribute('role')) {
      closeButton.setAttribute('role', 'button');
    }
    if (!closeButton.getAttribute('aria-label')) {
      closeButton.setAttribute('aria-label', strings().common.close);
    }
  }

  protected createTitle(): void {
    if (!this.options.title) return;

    if (!this.options.titleIcon) {
      this.setTitle(this.options.title);
      return;
    }

    this.titleEl.replaceChildren();
    const titleIcon = this.titleEl.createSpan({
      cls: 'advancedNoteMover-modal-title-icon',
    });
    titleIcon.ariaHidden = 'true';
    setIcon(titleIcon, this.options.titleIcon);
    this.titleEl.createSpan({ text: this.options.title });
  }

  /**
   * Setup auto focus on specified element
   */
  protected setupAutoFocus(): void {
    if (!this.options.autoFocus) return;

    viewTimeout(() => {
      if (!this.alive) return;
      const focusElement = this.firstField();
      if (focusElement) {
        focusElement.focus();
        this.resetScrollPosition();
      }
    }, 10);
  }

  private rememberOpener(): void {
    const doc = currentDocument();
    const active = doc.activeElement;
    if (
      !isHtmlElement(active) ||
      active === doc.body ||
      this.modalEl.contains(active)
    ) {
      this.opener = null;
      return;
    }
    this.opener = active;
  }

  /** First text field, then the configured fallback such as the primary button. */
  private firstField(): HTMLElement | null {
    const field = this.contentEl.querySelector(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
    );
    if (isHtmlElement(field)) return field;
    if (!this.options.focusSelector) return null;
    const fallback = this.contentEl.querySelector(this.options.focusSelector);
    return isHtmlElement(fallback) ? fallback : null;
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

function isHtmlElement(node: Element | null): node is HTMLElement {
  if (!node) return false;
  if (typeof node.instanceOf === 'function') {
    return node.instanceOf(HTMLElement);
  }
  return false;
}

function currentDocument(): Document {
  return typeof activeDocument === 'undefined' ? document : activeDocument;
}
