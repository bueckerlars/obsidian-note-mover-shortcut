import { App, Component, MarkdownRenderer, Setting } from 'obsidian';
import { fill, strings } from '../i18n/locale';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';
import { toMarkdownInlineCode } from '../utils/markdown-confirm';
import type {
  ConflictModalResult,
  ConflictResolutionAction,
} from '../types/ConflictResolution';

export interface ConflictModalOptions extends BaseModalOptions {
  title: string;
  fileName: string;
  sourcePath: string;
  targetPath: string;
}

function conflictTooltip(action: ConflictResolutionAction): string {
  const copy = strings().modals;
  if (action === 'skip') return copy.conflictSkipTooltip;
  if (action === 'rename') return copy.conflictRenameTooltip;
  return copy.conflictOverwriteTooltip;
}

export class ConflictModal extends BaseModal {
  private conflictOptions: ConflictModalOptions;
  private resolvePromise: (value: ConflictModalResult) => void = () => {};
  private hasResolved = false;
  private applyAlways = false;
  private warningEl: HTMLElement | null = null;
  private readonly messageRenderComponent = new Component();

  constructor(app: App, options: ConflictModalOptions) {
    super(app, {
      cssClass: 'advancedNoteMover-conflict-modal',
      size: 'small',
      focusSelector: '.advancedNoteMover-conflict-action-skip',
      ...options,
    });
    this.conflictOptions = options;
  }

  protected createContent(): void {
    const { contentEl } = this;
    const isMobile = MobileUtils.isMobile();

    const copy = strings().modals;
    const message = [
      fill(copy.conflictExists, {
        fileName: toMarkdownInlineCode(this.conflictOptions.fileName),
      }),
      '',
      fill(copy.conflictCurrent, {
        path: toMarkdownInlineCode(this.conflictOptions.sourcePath),
      }),
      fill(copy.conflictTarget, {
        path: toMarkdownInlineCode(this.conflictOptions.targetPath),
      }),
      '',
      copy.conflictChoose,
    ].join('\n');

    const messageEl = contentEl.createDiv({
      cls: isMobile
        ? 'advancedNoteMover-conflict-modal-message advancedNoteMover-conflict-modal-message-mobile'
        : 'advancedNoteMover-conflict-modal-message',
    });
    void MarkdownRenderer.render(
      this.app,
      message,
      messageEl,
      '',
      this.messageRenderComponent
    );

    this.warningEl = contentEl.createDiv({
      cls: 'advancedNoteMover-conflict-modal-warning',
    });
    this.warningEl.setAttribute('aria-live', 'polite');
    this.updateWarning();

    new Setting(contentEl)
      .setName(strings().modals.conflictAlwaysName)
      .setDesc(strings().modals.conflictAlwaysDesc)
      .addToggle(toggle =>
        toggle.setValue(false).onChange(value => {
          this.applyAlways = value;
          this.updateWarning();
        })
      );

    if (isMobile) {
      this.createMobileActions(contentEl);
    } else {
      this.createDesktopActions(contentEl);
    }
  }

  private updateWarning(): void {
    if (!this.warningEl) {
      return;
    }
    this.warningEl.empty();
    if (this.applyAlways) {
      this.warningEl.createEl('p', {
        cls: 'advancedNoteMover-conflict-modal-warning-text mod-warning',
        text: strings().modals.conflictAlwaysWarning,
      });
    }
  }

  private createDesktopActions(container: HTMLElement): void {
    const buttonContainer = this.createButtonContainer(container);

    this.createButton(
      buttonContainer,
      strings().modals.conflictKeepInPlace,
      () => this.finish('skip'),
      {
        icon: 'ban',
        tooltip: conflictTooltip('skip'),
      }
    ).addClass('advancedNoteMover-conflict-action-skip');

    this.createButton(
      buttonContainer,
      strings().modals.conflictRename,
      () => this.finish('rename'),
      {
        icon: 'pencil',
        tooltip: conflictTooltip('rename'),
      }
    );

    this.createButton(
      buttonContainer,
      strings().modals.conflictOverwrite,
      () => this.finish('overwrite'),
      {
        isWarning: true,
        icon: 'alert-triangle',
        tooltip: conflictTooltip('overwrite'),
      }
    );
  }

  private createMobileActions(container: HTMLElement): void {
    const actions: Array<{
      text: string;
      action: ConflictResolutionAction;
      primary?: boolean;
      warning?: boolean;
    }> = [
      {
        text: strings().modals.conflictKeepInPlace,
        action: 'skip',
        primary: true,
      },
      { text: strings().modals.conflictRename, action: 'rename' },
      {
        text: strings().modals.conflictOverwrite,
        action: 'overwrite',
        warning: true,
      },
    ];

    for (const { text, action, primary, warning } of actions) {
      new Setting(container).addButton(btn => {
        btn
          .setButtonText(text)
          .setTooltip(conflictTooltip(action))
          .onClick(() => this.finish(action));
        if (primary) {
          btn.setCta();
          btn.buttonEl.addClass('advancedNoteMover-conflict-action-skip');
        }
        if (warning) {
          btn.buttonEl.addClass('mod-warning');
        }
      });
    }
  }

  private finish(action: ConflictResolutionAction): void {
    this.hasResolved = true;
    this.resolvePromise({ action, applyAlways: this.applyAlways });
    this.close();
  }

  onClose() {
    this.messageRenderComponent.unload();
    if (!this.hasResolved) {
      this.resolvePromise({ action: 'skip', applyAlways: false });
    }
    this.hasResolved = true;
    super.onClose();
  }

  resolve(): Promise<ConflictModalResult> {
    return new Promise(resolve => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  static async show(
    app: App,
    options: ConflictModalOptions
  ): Promise<ConflictModalResult> {
    const modal = new ConflictModal(app, options);
    return modal.resolve();
  }
}
