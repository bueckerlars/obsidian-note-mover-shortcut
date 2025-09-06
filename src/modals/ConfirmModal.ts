import { Modal, App, Setting, ButtonComponent } from 'obsidian';

export interface ConfirmModalOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

export class ConfirmModal extends Modal {
    private options: ConfirmModalOptions;
    private resolvePromise: (value: boolean) => void = () => {};

    constructor(app: App, options: ConfirmModalOptions) {
        super(app);
        this.options = {
            confirmText: 'OK',
            cancelText: 'Cancel',
            danger: false,
            ...options
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('confirm-modal');

        // Set modal size
        const modalContainer = contentEl.parentElement;
        if (modalContainer) {
            modalContainer.style.width = '400px';
            modalContainer.style.minWidth = '350px';
        }

        // Title
        const titleEl = contentEl.createEl('h2', { 
            text: this.options.title,
            cls: 'confirm-modal-title'
        });

        // Message
        const messageEl = contentEl.createEl('div', { 
            cls: 'confirm-modal-message'
        });
        messageEl.innerHTML = this.options.message;

        // Button container
        const buttonContainer = contentEl.createEl('div', { 
            cls: 'confirm-modal-buttons' 
        });

        // Cancel button
        new Setting(buttonContainer)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText(this.options.cancelText || 'Cancel');
                btn.onClick(() => {
                    this.resolvePromise(false);
                    this.close();
                });
            });

        // Confirm button
        new Setting(buttonContainer)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText(this.options.confirmText || 'OK');
                if (this.options.danger) {
                    btn.setWarning();
                }
                btn.setCta();
                btn.onClick(() => {
                    this.resolvePromise(true);
                    this.close();
                });
            });

        // Focus the confirm button by default
        setTimeout(() => {
            const confirmButton = buttonContainer.querySelector('.mod-cta') as HTMLButtonElement;
            if (confirmButton) {
                confirmButton.focus();
            }
        }, 10);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        // Ensure promise is resolved even if modal is closed without clicking a button
        this.resolvePromise(false);
    }

    /**
     * Shows the confirmation modal and returns a promise that resolves to true if confirmed, false if cancelled
     */
    confirm(): Promise<boolean> {
        return new Promise((resolve) => {
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
