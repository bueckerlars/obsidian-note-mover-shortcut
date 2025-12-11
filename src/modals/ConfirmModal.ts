import { App, Setting } from 'obsidian';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';

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
      cssClass: 'noteMover-confirm-modal',
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
    const isMobile = MobileUtils.isMobile();

    // Message
    const messageEl = contentEl.createEl('div', {
      cls: isMobile
        ? 'noteMover-confirm-modal-message noteMover-confirm-modal-message-mobile'
        : 'noteMover-confirm-modal-message',
    });
    messageEl.innerHTML = this.confirmOptions.message;

    if (isMobile) {
      // Mobile: Stack buttons vertically, full-width
      // Confirm button first (primary action)
      const confirmSetting = new Setting(contentEl).addButton(btn => {
        btn
          .setButtonText(this.confirmOptions.confirmText || 'OK')
          .setCta()
          .onClick(() => {
            this.resolvePromise(true);
            this.close();
          });
        if (this.confirmOptions.danger) {
          btn.setWarning();
        }
      });
      const confirmBtn = confirmSetting.settingEl.querySelector('button');
      if (confirmBtn) {
        confirmBtn.style.width = '100%';
        confirmBtn.style.minHeight = '48px';
      }

      // Cancel button
      const cancelSetting = new Setting(contentEl).addButton(btn => {
        btn
          .setButtonText(this.confirmOptions.cancelText || 'Cancel')
          .onClick(() => {
            this.resolvePromise(false);
            this.close();
          });
      });
      const cancelBtn = cancelSetting.settingEl.querySelector('button');
      if (cancelBtn) {
        cancelBtn.style.width = '100%';
        cancelBtn.style.minHeight = '48px';
      }
    } else {
      // Desktop: Original horizontal layout
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
