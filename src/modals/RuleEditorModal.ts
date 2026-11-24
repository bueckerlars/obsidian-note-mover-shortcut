import { App, DropdownComponent, Setting, setIcon } from 'obsidian';
import { BaseModal } from './BaseModal';
import { ConfirmModal } from './ConfirmModal';
import { renderModalFooter } from './modalFooter';
import type { RuleV2 } from '../types/RuleV2';
import type { FileMetadata } from '../types/Common';
import type { PluginVaultIndexCache } from '../infrastructure/cache/plugin-vault-index-cache';
import { collectPropertySamples } from '../domain/property/extractFrontmatterProperties';
import {
  validateRuleFields,
  type RuleIssues,
} from '../domain/rules/ruleValidation';
import {
  createdPlaceholders,
  propertyPlaceholders,
} from '../domain/templates/placeholderCatalog';
import { findPlaceholderProblems } from '../domain/templates/placeholderValidation';
import { resolveDestinationPreview } from '../domain/templates/resolveDestinationPreview';
import { fill, strings } from '../i18n/locale';
import { MobileUtils } from '../utils/MobileUtils';
import { NoticeManager } from '../utils/NoticeManager';
import { toMarkdownInlineCode } from '../utils/markdown-confirm';
import { ConditionList } from './rule-editor/components/ConditionList';
import {
  renderDestinationField,
  type DestinationFieldHandle,
} from './rule-editor/components/DestinationField';
import { renderMatchList } from './rule-editor/components/MatchList';
import { renderMatchModeSentence } from './rule-editor/components/MatchModeSentence';
import {
  renderRuleNameField,
  type RuleNameFieldHandle,
} from './rule-editor/components/RuleNameField';
import {
  FolderCreationValue,
  applyFolderCreationValue,
  getFolderCreationValue,
} from './rule-editor/ruleEditorShared';
import { openEditor } from './rule-editor/ruleEditorState';
import {
  createRuleLivePreview,
  fileMetadataFromCache,
  isAbortError,
  type RuleMatches,
} from './rule-editor/ruleLivePreview';

interface RuleEditorModalOptions {
  rule: RuleV2;
  isEditMode: boolean;
  onSave: (rule: RuleV2) => Promise<void>;
  onDelete?: () => Promise<void>;
  vaultIndexCache?: PluginVaultIndexCache;
  /** Plugin-wide setting shown in "Use plugin setting (on|off)". */
  createFoldersByDefault?: boolean;
  /** Opens the preview for this rule. Only offered for a saved rule. */
  onOpenPreview?: () => void;
}

const EMPTY_MATCHES: RuleMatches = { count: 0, samples: [] };

/** One editor for new and existing rules on every platform. */
export class RuleEditorModal extends BaseModal {
  private readonly workingRule: RuleV2;
  private readonly originalRule: RuleV2;
  private isForceClosing = false;
  private discardRequested = false;
  private readonly livePreview = createRuleLivePreview(300);
  private files: FileMetadata[] | null = null;
  private matches: RuleMatches = EMPTY_MATCHES;
  private destinationTouched = false;

  private nameField: RuleNameFieldHandle | null = null;
  private conditions: ConditionList | null = null;
  private destination: DestinationFieldHandle | null = null;
  private matchList: ReturnType<typeof renderMatchList> | null = null;
  private primary: { setDisabled(disabled: boolean): unknown } | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(
    app: App,
    private readonly ruleOptions: RuleEditorModalOptions
  ) {
    super(app, {
      title: ruleOptions.isEditMode
        ? strings().modals.ruleEditorTitleEdit
        : strings().modals.ruleEditorTitleNew,
      cssClass: 'advancedNoteMover-rule-editor-modal',
      autoFocus: !MobileUtils.isMobile(),
    });
    const session = openEditor(ruleOptions.rule);
    this.workingRule = session.draft;
    this.originalRule = session.saved;
  }

  protected createContent(): void {
    const { contentEl } = this;
    const text = strings().modals;
    this.modalEl.addClass('advancedNoteMover-rule-editor');
    const body = contentEl.createDiv();

    this.nameField = renderRuleNameField(body, {
      value: this.workingRule.name,
      onChange: value => {
        this.workingRule.name = value;
        this.refresh();
      },
      onEnter: () => {
        if (this.invalidCount() === 0) void this.handleSave();
      },
    });
    const active = new Setting(body)
      .setName(text.ruleEditorActive)
      .addToggle(toggle =>
        toggle.setValue(this.workingRule.active).onChange(value => {
          this.workingRule.active = value;
        })
      );
    if (this.ruleOptions.isEditMode) active.setDesc(text.ruleEditorActiveDesc);

    body.createEl('hr', { cls: 'advancedNoteMover-editor-divider' });
    const sentence = body.createDiv();
    renderMatchModeSentence(sentence, {
      value: this.workingRule.aggregation,
      onChange: value => {
        this.workingRule.aggregation = value;
        this.conditions?.refreshJoiners();
        this.schedulePreview();
      },
    });
    this.conditions = new ConditionList(sentence, {
      app: this.app,
      rule: this.workingRule,
      vaultIndexCache: this.ruleOptions.vaultIndexCache,
      onChange: () => {
        this.refresh();
        this.schedulePreview();
      },
    });

    body.createEl('hr', { cls: 'advancedNoteMover-editor-divider' });
    const destinationEl = body.createDiv();
    this.destination = renderDestinationField(destinationEl, {
      app: this.app,
      value: this.workingRule.destination,
      onChange: value => {
        this.workingRule.destination = value;
        this.refresh();
      },
      getPlaceholders: () => this.placeholderOptions(),
      onHelp: () => NoticeManager.info(text.ruleEditorPlaceholderHelpText),
    });
    this.destination.input.addEventListener('blur', () => {
      this.destinationTouched = true;
      this.refresh();
    });
    this.addFolderCreation(body);

    body.createEl('hr', { cls: 'advancedNoteMover-editor-divider' });
    this.matchList = renderMatchList(body, {
      onOpenPreview: this.ruleOptions.onOpenPreview,
    });

    this.renderFooter(contentEl);
    this.refresh();
    this.schedulePreview();
  }

  private addFolderCreation(parent: HTMLElement): void {
    const text = strings().modals;
    const state = this.ruleOptions.createFoldersByDefault ?? true;
    new Setting(parent)
      .setName(text.ruleEditorCreateFolderName)
      .addDropdown((dropdown: DropdownComponent) =>
        dropdown
          .addOption(
            'inherit',
            fill(text.ruleEditorInherit, {
              state: state
                ? strings().ruleSummary.on
                : strings().ruleSummary.off,
            })
          )
          .addOption('always', text.ruleEditorAlwaysCreate)
          .addOption('never', text.ruleEditorNeverCreate)
          .setValue(getFolderCreationValue(this.workingRule))
          .onChange(value =>
            applyFolderCreationValue(
              this.workingRule,
              value as FolderCreationValue
            )
          )
      );
  }

  private renderFooter(parent: HTMLElement): void {
    const text = strings().modals;
    const footer = renderModalFooter(parent, {
      primaryText: this.ruleOptions.isEditMode
        ? strings().common.save
        : text.ruleEditorCreate,
      onPrimary: () => void this.handleSave(),
      cancelText: strings().common.cancel,
      onCancel: () => this.close(),
    });
    this.primary = footer.primary;
    if (this.ruleOptions.isEditMode && this.ruleOptions.onDelete) {
      const remove = footer.leftEl.createEl('button', {
        cls: 'advancedNoteMover-danger-text-button',
        attr: { type: 'button' },
      });
      setIcon(remove.createSpan(), 'trash-2');
      remove.createSpan({ text: text.ruleEditorDeleteRule });
      remove.addEventListener('click', () => void this.handleRemoveRule());
    }
    this.statusEl = footer.leftEl.createSpan({
      cls: 'advancedNoteMover-footer-status',
      attr: { 'aria-live': 'polite' },
    });
  }

  private issues(): RuleIssues {
    return validateRuleFields(this.workingRule);
  }

  /** Fields that block saving, including ones not flagged yet. */
  private invalidCount(): number {
    const issues = this.issues();
    return (
      Number(issues.nameEmpty) +
      Number(issues.destination !== null) +
      (this.conditions?.blockingCount(issues.conditions) ?? 0)
    );
  }

  /** Marks fields and updates the footer. Cheap, runs on every edit. */
  private refresh(): void {
    const issues = this.issues();
    const text = strings().modals;
    this.nameField?.setError(
      issues.nameEmpty ? text.ruleEditorNameEmpty : null
    );
    this.conditions?.setIssues(issues.conditions);
    this.updateDestination(issues);

    const total = this.invalidCount();
    const unflagged =
      (issues.destination === 'empty' && !this.destinationTouched ? 1 : 0) +
      (this.conditions?.unflaggedCount(issues.conditions) ?? 0);
    const shown = total - unflagged > 0 ? total - unflagged : total;
    this.primary?.setDisabled(total > 0);
    this.statusEl?.setText(
      total === 0
        ? ''
        : shown === 1
          ? fill(text.ruleEditorAttentionOne, { count: 1 })
          : fill(text.ruleEditorAttentionMany, { count: shown })
    );
  }

  private updateDestination(issues: RuleIssues): void {
    const sample = this.matches.samples[0] ?? null;
    const path = sample
      ? resolveDestinationPreview(this.workingRule.destination, sample)
      : null;
    this.destination?.update({
      emptyError: issues.destination === 'empty' && this.destinationTouched,
      problem:
        issues.destination === 'placeholder'
          ? (findPlaceholderProblems(this.workingRule.destination)[0] ?? null)
          : null,
      resolved:
        sample && path
          ? { note: sample.fileName.replace(/\.[^.]+$/, ''), path }
          : null,
    });
  }

  private vaultFiles(): FileMetadata[] {
    if (!this.files) {
      const files = this.ruleOptions.vaultIndexCache
        ? this.ruleOptions.vaultIndexCache.getMarkdownFilesCached(this.app)
        : this.app.vault.getMarkdownFiles();
      this.files = files.map(file =>
        fileMetadataFromCache(file, this.app.metadataCache.getFileCache(file))
      );
    }
    return this.files;
  }

  private placeholderOptions() {
    const sample = this.matches.samples[0] ?? null;
    return {
      created: createdPlaceholders(sample?.createdAt),
      properties: propertyPlaceholders(
        collectPropertySamples(this.vaultFiles().map(file => file.properties))
      ),
    };
  }

  private schedulePreview(): void {
    const rule = this.workingRule;
    const incomplete = this.conditions?.firstIncomplete(
      this.issues().conditions
    );
    if (incomplete) {
      this.livePreview.dispose();
      this.matches = EMPTY_MATCHES;
      this.renderMatches(incomplete);
      return;
    }
    // An off rule still shows what it would match.
    void this.livePreview
      .update({ ...rule, active: true }, this.vaultFiles())
      .then(
        matches => {
          this.matches = matches;
          this.renderMatches(null);
        },
        error => {
          if (!isAbortError(error)) throw error;
        }
      );
  }

  private renderMatches(incomplete: RuleV2['triggers'][number] | null): void {
    const things = strings().ruleEditorMatchesEmpty;
    this.matchList?.update({
      count: this.matches.count,
      incomplete: incomplete
        ? this.conditions?.isPending(incomplete)
          ? things.condition
          : things[incomplete.criteriaType]
        : null,
      rows: this.matches.samples.map(sample => ({
        name: sample.fileName.replace(/\.[^.]+$/, ''),
        from: sample.filePath.includes('/')
          ? sample.filePath.slice(0, sample.filePath.lastIndexOf('/'))
          : '/',
        to: resolveDestinationPreview(this.workingRule.destination, sample),
        destination: this.workingRule.destination || '—',
      })),
    });
    this.refresh();
  }

  private async handleSave(): Promise<void> {
    if (this.invalidCount() > 0) return;
    await this.ruleOptions.onSave(this.workingRule);
    this.isForceClosing = true;
    super.close();
  }

  private async handleRemoveRule(): Promise<void> {
    const confirmed = await ConfirmModal.show(this.app, {
      title: strings().modals.ruleEditorDeleteTitle,
      message: fill(strings().modals.confirmDeleteRule, {
        rule: toMarkdownInlineCode(this.workingRule.name),
      }),
      confirmText: strings().common.delete,
      cancelText: strings().common.cancel,
      danger: true,
    });
    if (confirmed && this.ruleOptions.onDelete) {
      await this.ruleOptions.onDelete();
      this.isForceClosing = true;
      super.close();
    }
  }

  private hasUnsavedChanges(): boolean {
    return (
      JSON.stringify(this.workingRule) !== JSON.stringify(this.originalRule)
    );
  }

  private async confirmDiscardAndClose(): Promise<void> {
    const confirmed = await ConfirmModal.show(this.app, {
      title: strings().modals.ruleEditorDiscardTitle,
      message: strings().modals.ruleEditorDiscardMessage,
      confirmText: strings().modals.ruleEditorDiscardConfirm,
      cancelText: strings().common.cancel,
      danger: true,
    });
    if (confirmed) {
      this.isForceClosing = true;
      super.close();
    }
  }

  close(): void {
    if (this.isForceClosing || !this.hasUnsavedChanges()) {
      super.close();
      return;
    }
    if (this.discardRequested) return;
    this.discardRequested = true;
    void this.confirmDiscardAndClose().finally(() => {
      this.discardRequested = false;
    });
  }

  onClose(): void {
    this.livePreview.dispose();
    this.conditions?.destroy();
    this.destination?.destroy();
    this.conditions = null;
    this.destination = null;
    super.onClose();
  }
}
