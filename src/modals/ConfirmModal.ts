import { App } from 'obsidian';
import { BaseModal, BaseModalOptions } from './BaseModal';

export interface ConfirmModalOptions extends BaseModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export class ConfirmModal extends BaseModal {
  private confirmOptions: ConfirmModalOptions;
  private resolvePromise: (value: boolean) => void = () => {};

  constructor(app: App, options: ConfirmModalOptions) {
    super(app, {
      cssClass: 'confirm-modal',
      size: 'small',
      ...options,
    });
    this.confirmOptions = {
      confirmText: 'OK',
      cancelText: 'Cancel',
      danger: false,
      ...options,
    };
  }

  protected createContent(): void {
    const { contentEl } = this;

    // Message
    const messageEl = contentEl.createEl('div', {
      cls: 'confirm-modal-message',
    });
    messageEl.innerHTML = this.confirmOptions.message;

    // Button container
    const buttonContainer = this.createButtonContainer(contentEl);

    // Cancel button
    this.createButton(
      buttonContainer,
      this.confirmOptions.cancelText || 'Cancel',
      () => {
        this.resolvePromise(false);
        this.close();
      }
    );

    // Confirm button
    this.createButton(
      buttonContainer,
      this.confirmOptions.confirmText || 'OK',
      () => {
        this.resolvePromise(true);
        this.close();
      },
      {
        isPrimary: true,
        isWarning: this.confirmOptions.danger,
      }
    );
  }

  onClose() {
    super.onClose();
    // Ensure promise is resolved even if modal is closed without clicking a button
    this.resolvePromise(false);
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
