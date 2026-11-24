import { App, Component, MarkdownRenderer, setIcon } from 'obsidian';
import { strings } from '../i18n/locale';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { renderModalFooter } from './modalFooter';

interface ConfirmListRow {
  name: string;
  /** Right-aligned, drawn with a folder icon. */
  destination: string;
}

export interface ConfirmModalOptions extends BaseModalOptions {
  title: string;
  /** Markdown body (rendered via MarkdownRenderer). */
  message: string;
  /** Neutral box under the message, e.g. the first notes of a bulk move. */
  list?: { rows: readonly ConfirmListRow[]; more?: string };
  /** Link button on the left of the footer. */
  leftLink?: { text: string; onClick: () => void };
  confirmText?: string;
  cancelText?: string;
  /** Destructive: red primary button and initial focus on Cancel. */
  danger?: boolean;
  /** Overrides the default focus (Cancel when `danger`, otherwise the primary). */
  initialFocus?: 'confirm' | 'cancel';
}

export class ConfirmModal extends BaseModal {
  private confirmOptions: ConfirmModalOptions;
  private resolvePromise: (value: boolean) => void = () => {};
  private hasResolved = false;
  private readonly messageRenderComponent = new Component();

  constructor(app: App, options: ConfirmModalOptions) {
    const focusCancel =
      (options.initialFocus ?? (options.danger ? 'cancel' : 'confirm')) ===
      'cancel';
    super(app, {
      cssClass: 'advancedNoteMover-confirm-modal',
      size: 'small',
      focusSelector: focusCancel
        ? '.advancedNoteMover-confirm-cancel'
        : '.mod-cta, .mod-warning',
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
    const { contentEl, confirmOptions: options } = this;
    const body = contentEl.createDiv({
      cls: 'advancedNoteMover-confirm-body',
    });
    const id = 'advancedNoteMover-confirm-message';
    this.titleEl.id = 'advancedNoteMover-confirm-title';
    this.modalEl.setAttribute('role', 'alertdialog');
    this.modalEl.setAttribute('aria-labelledby', this.titleEl.id);
    this.modalEl.setAttribute('aria-describedby', id);
    const messageEl = body.createDiv({
      cls: 'advancedNoteMover-confirm-message',
    });
    messageEl.id = id;
    void MarkdownRenderer.render(
      this.app,
      options.message,
      messageEl,
      '',
      this.messageRenderComponent
    );

    if (options.list) {
      const list = body.createDiv({ cls: 'advancedNoteMover-confirm-list' });
      for (const row of options.list.rows) {
        const item = list.createDiv({ cls: 'advancedNoteMover-confirm-row' });
        item.createSpan({
          cls: 'advancedNoteMover-confirm-row-name',
          text: row.name,
        });
        const path = item.createSpan({ cls: 'advancedNoteMover-path' });
        setIcon(
          path.createSpan({ cls: 'advancedNoteMover-path-icon' }),
          'folder'
        );
        path.createSpan({ text: row.destination });
      }
      if (options.list.more) {
        list.createDiv({
          cls: 'advancedNoteMover-confirm-more',
          text: options.list.more,
        });
      }
    }

    const footer = renderModalFooter(contentEl, {
      primaryText: options.confirmText ?? strings().common.ok,
      onPrimary: () => {
        this.finish(true);
      },
      warning: options.danger,
      cancelText: options.cancelText ?? strings().common.cancel,
      onCancel: () => {
        this.finish(false);
      },
    });
    footer.cancel?.buttonEl.addClass('advancedNoteMover-confirm-cancel');
    if (options.leftLink) {
      const { text, onClick } = options.leftLink;
      const link = footer.leftEl.createEl('button', {
        text,
        cls: 'advancedNoteMover-link-button',
      });
      link.addEventListener('click', () => {
        this.finish(false);
        onClick();
      });
    }
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
