import { App, Component, MarkdownRenderer, Setting } from 'obsidian';
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

const CONFLICT_ACTION_TOOLTIPS: Record<
  Exclude<ConflictResolutionAction, 'cancel'>,
  string
> = {
  skip: 'Leave the note in its current location and remember this conflict',
  rename: 'Move the note with a numeric suffix, for example note (1).md',
  overwrite:
    'Replace the existing file at the destination. Existing content will be lost.',
};

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

    const message = [
      `A file named ${toMarkdownInlineCode(this.conflictOptions.fileName)} already exists at the destination.`,
      '',
      `**Current:** ${toMarkdownInlineCode(this.conflictOptions.sourcePath)}`,
      `**Target:** ${toMarkdownInlineCode(this.conflictOptions.targetPath)}`,
      '',
      'Choose how to handle this conflict:',
    ].join('\n');

    const messageEl = contentEl.createEl('div', {
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

    this.warningEl = contentEl.createEl('div', {
      cls: 'advancedNoteMover-conflict-modal-warning',
    });
    this.updateWarning();

    new Setting(contentEl)
      .setName('Always use this choice')
      .setDesc(
        'Apply the selected strategy automatically for future conflicts without asking.'
      )
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
        text: 'Warning: Future conflicts will be handled automatically without asking. Choosing overwrite will replace existing files at the destination.',
      });
    }
  }

  private createDesktopActions(container: HTMLElement): void {
    const buttonContainer = this.createButtonContainer(container);

    this.createButton(
      buttonContainer,
      'Keep in place',
      () => this.finish('skip'),
      {
        icon: 'ban',
        tooltip: CONFLICT_ACTION_TOOLTIPS.skip,
      }
    ).addClass('advancedNoteMover-conflict-action-skip');

    this.createButton(buttonContainer, 'Rename', () => this.finish('rename'), {
      icon: 'pencil',
      tooltip: CONFLICT_ACTION_TOOLTIPS.rename,
    });

    this.createButton(
      buttonContainer,
      'Overwrite',
      () => this.finish('overwrite'),
      {
        isWarning: true,
        icon: 'alert-triangle',
        tooltip: CONFLICT_ACTION_TOOLTIPS.overwrite,
      }
    );
  }

  private createMobileActions(container: HTMLElement): void {
    const actions: Array<{
      text: string;
      action: Exclude<ConflictResolutionAction, 'cancel'>;
      primary?: boolean;
      warning?: boolean;
    }> = [
      { text: 'Keep in place', action: 'skip', primary: true },
      { text: 'Rename', action: 'rename' },
      { text: 'Overwrite', action: 'overwrite', warning: true },
    ];

    for (const { text, action, primary, warning } of actions) {
      new Setting(container).addButton(btn => {
        btn
          .setButtonText(text)
          .setTooltip(CONFLICT_ACTION_TOOLTIPS[action])
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
