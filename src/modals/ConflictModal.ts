import { App, setIcon } from 'obsidian';
import { fill, strings } from '../i18n/locale';
import { MobileUtils } from '../utils/MobileUtils';
import { BaseModal } from './BaseModal';
import { renderModalFooter } from './modalFooter';
import type {
  ConflictModalResult,
  ConflictResolutionAction,
} from '../types/ConflictResolution';

/** One of the two notes, with texts the caller has already worked out. */
interface ConflictSide {
  folder: string;
  /** "Edited today, 23:20 · 214 words" */
  details: string;
}

export interface ConflictModalOptions {
  sourcePath: string;
  targetPath: string;
  noteName: string;
  targetFolder: string;
  /** Name "Keep both" would give the moved note, without extension. */
  renamedName: string;
  moving: ConflictSide;
  existing: ConflictSide;
  /** Conflicts still to come in the same run. */
  otherConflicts: number;
}

export class ConflictModal extends BaseModal {
  private resolvePromise: (value: ConflictModalResult) => void = () => {};
  private hasResolved = false;
  private action: ConflictResolutionAction = 'rename';
  private applyToRest = false;

  constructor(
    app: App,
    private conflictOptions: ConflictModalOptions
  ) {
    super(app, {
      // Phone: the sheet header names the dialog, the first line names the note.
      title: MobileUtils.isPhone()
        ? strings().modals.conflictSheetTitle
        : fill(strings().modals.conflictTitle, {
            name: conflictOptions.noteName,
          }),
      cssClass: 'advancedNoteMover-conflict-modal',
      phoneFullscreen: true,
      size: 'small',
    });
  }

  protected createContent(): void {
    const { contentEl, conflictOptions: options } = this;
    const copy = strings().modals;

    contentEl.createEl('p', {
      cls: 'advancedNoteMover-conflict-lead advancedNoteMover-phone-only',
      text: fill(copy.conflictTitle, { name: options.noteName }),
    });
    contentEl.createEl('p', {
      cls: 'advancedNoteMover-modal-sub',
      text: fill(copy.conflictIntro, { folder: options.targetFolder }),
    });

    const sides = contentEl.createDiv({
      cls: 'advancedNoteMover-conflict-sides',
    });
    this.renderSide(sides, copy.conflictMoving, options.moving);
    this.renderSide(sides, copy.conflictAlreadyThere, options.existing);

    const choices = contentEl.createEl('fieldset', {
      cls: 'advancedNoteMover-conflict-choices',
    });
    choices.createEl('legend', {
      cls: 'advancedNoteMover-strong',
      text: copy.conflictLegend,
    });
    const list = choices.createDiv({ cls: 'advancedNoteMover-conflict-list' });
    this.renderChoice(
      list,
      'rename',
      copy.conflictKeepBoth,
      fill(copy.conflictKeepBothDesc, { name: options.renamedName })
    );
    this.renderChoice(
      list,
      'skip',
      copy.conflictSkip,
      fill(copy.conflictSkipDesc, {
        folder: options.moving.folder || strings().modals.previewVaultRoot,
      })
    );
    this.renderChoice(
      list,
      'overwrite',
      copy.conflictReplace,
      copy.conflictReplaceDesc,
      true
    );

    const footer = renderModalFooter(contentEl, {
      primaryText: copy.conflictContinue,
      onPrimary: () => this.finish(this.action, this.applyToRest),
      cancelText: strings().common.cancel,
      onCancel: () => this.finish('skip', false),
    });
    if (options.otherConflicts > 0) {
      const label = footer.leftEl.createEl('label', {
        cls: 'advancedNoteMover-conflict-rest',
      });
      label
        .createEl('input', { type: 'checkbox' })
        .addEventListener('change', event => {
          this.applyToRest = (event.target as HTMLInputElement).checked;
        });
      label.createSpan({
        text:
          options.otherConflicts === 1
            ? copy.conflictApplyToRestOne
            : fill(copy.conflictApplyToRestMany, {
                count: options.otherConflicts,
              }),
      });
    }
  }

  private renderSide(
    parent: HTMLElement,
    label: string,
    side: ConflictSide
  ): void {
    const box = parent.createDiv({ cls: 'advancedNoteMover-conflict-side' });
    box.createDiv({ cls: 'advancedNoteMover-faint', text: label });
    const path = box.createDiv({ cls: 'advancedNoteMover-path' });
    setIcon(path.createSpan({ cls: 'advancedNoteMover-path-icon' }), 'folder');
    path.createEl('b', {
      text: side.folder || strings().modals.previewVaultRoot,
    });
    box.createDiv({
      cls: 'advancedNoteMover-conflict-details',
      text: side.details,
    });
  }

  private renderChoice(
    parent: HTMLElement,
    action: ConflictResolutionAction,
    name: string,
    description: string,
    danger = false
  ): void {
    const row = parent.createEl('label', {
      cls: 'advancedNoteMover-conflict-choice',
    });
    const radio = row.createEl('input', { type: 'radio' });
    radio.name = 'advancedNoteMover-conflict-action';
    radio.checked = action === this.action;
    radio.addEventListener('change', () => {
      this.action = action;
    });
    const text = row.createDiv();
    text.createDiv({
      cls: danger ? 'advancedNoteMover-conflict-danger' : undefined,
      text: name,
    });
    text.createDiv({
      cls: 'advancedNoteMover-conflict-details',
      text: description,
    });
  }

  private finish(action: ConflictResolutionAction, applyToRest: boolean): void {
    this.hasResolved = true;
    this.resolvePromise({ action, applyToRest });
    this.close();
  }

  onClose() {
    if (!this.hasResolved) {
      this.resolvePromise({ action: 'skip', applyToRest: false });
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
}
