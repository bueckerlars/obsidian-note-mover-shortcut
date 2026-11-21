import { App, Component, MarkdownRenderer } from 'obsidian';
import { strings } from '../i18n/locale';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';

export interface ConfirmModalOptions extends BaseModalOptions {
  title: string;
  /** Markdown body (rendered via MarkdownRenderer). */
  message: string;
  /** Plain lines. File paths belong here, not in `message`. */
  details?: readonly string[];
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export class ConfirmModal extends BaseModal {
  private confirmOptions: ConfirmModalOptions;
  private resolvePromise: (value: boolean) => void = () => {};
  private hasResolved = false;
  private readonly messageRenderComponent = new Component();

  constructor(app: App, options: ConfirmModalOptions) {
    super(app, {
      cssClass: 'advancedNoteMover-confirm-modal',
      size: 'small',
      ...options,
    });
    this.confirmOptions = {
      confirmText: strings().common.ok,
      cancelText: strings().common.cancel,
      danger: false,
      ...options,
    };
  }

  protected createContent(): void {
    const { contentEl } = this;
    const isMobile = MobileUtils.isMobile();

    const messageEl = contentEl.createDiv({
      cls: isMobile
        ? 'advancedNoteMover-confirm-modal-message advancedNoteMover-confirm-modal-message-mobile'
        : 'advancedNoteMover-confirm-modal-message',
    });
    void MarkdownRenderer.render(
      this.app,
      this.confirmOptions.message,
      messageEl,
      '',
      this.messageRenderComponent
    );

    const details = this.confirmOptions.details ?? [];
    if (details.length > 0) {
      const list = contentEl.createDiv({
        cls: 'advancedNoteMover-confirm-modal-details',
      });
      for (const line of details) {
        list.createDiv({
          cls: 'advancedNoteMover-confirm-modal-detail',
          text: line,
        });
      }
    }

    const buttonContainer = this.createButtonContainer(contentEl);
    this.createButton(
      buttonContainer,
      this.confirmOptions.cancelText ?? strings().common.cancel,
      () => {
        this.finish(false);
      }
    );
    this.createButton(
      buttonContainer,
      this.confirmOptions.confirmText ?? strings().common.ok,
      () => {
        this.finish(true);
      },
      {
        isPrimary: true,
        isWarning: this.confirmOptions.danger,
      }
    );
  }

  private finish(confirmed: boolean): void {
    this.hasResolved = true;
    this.resolvePromise(confirmed);
    this.close();
  }

  onClose() {
    this.messageRenderComponent.unload();
    // Resolve only if not already handled by a button (e.g. Esc / overlay)
    if (!this.hasResolved) {
      this.resolvePromise(false);
    }
    this.hasResolved = true;
    super.onClose();
  }

  /**
   * Shows the confirmation modal and returns a promise that resolves to true if confirmed, false if cancelled
   */
  confirm(): Promise<boolean> {
    return new Promise(resolve => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  /**
   * Static helper method to quickly show a confirmation dialog
   */
  static async show(app: App, options: ConfirmModalOptions): Promise<boolean> {
    const modal = new ConfirmModal(app, options);
    return modal.confirm();
  }
}
