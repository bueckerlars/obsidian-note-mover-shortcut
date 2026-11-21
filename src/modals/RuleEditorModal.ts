import { App, Setting } from 'obsidian';
import { BaseModal } from './BaseModal';
import { RuleV2 } from '../types/RuleV2';
import {
  SuggestRegistry,
  type DestroyableSuggest,
} from '../settings/suggesters/suggestLifecycle';
import { DragDropManager } from '../utils/DragDropManager';
import { MobileUtils } from '../utils/MobileUtils';
import type { PluginVaultIndexCache } from '../infrastructure/cache/plugin-vault-index-cache';
import { ConfirmModal } from './ConfirmModal';
import { NoticeManager } from '../utils/NoticeManager';
import { fill, plural, strings } from '../i18n/locale';
import {
  createRuleLivePreview,
  fileMetadataFromCache,
  isAbortError,
} from './rule-editor/ruleLivePreview';
import { toMarkdownInlineCode } from '../utils/markdown-confirm';
import { RuleEditorMobileView } from './rule-editor/RuleEditorMobileView';
import { renderAggregationControl } from './rule-editor/components/AggregationControl';
import { renderConditionRow } from './rule-editor/components/ConditionRow';
import {
  renderDestinationHelp,
  renderDestinationSetting,
} from './rule-editor/components/DestinationField';
import { renderRuleNameField } from './rule-editor/components/RuleNameField';
import {
  FolderCreationValue,
  applyFolderCreationValue,
  getFolderCreationValue,
} from './rule-editor/ruleEditorShared';
import {
  addCondition,
  openEditor,
  removeCondition,
  reorderConditions,
  validateRule,
} from './rule-editor/ruleEditorState';

interface RuleEditorModalOptions {
  rule: RuleV2;
  isEditMode: boolean;
  onSave: (rule: RuleV2) => Promise<void>;
  onDelete?: () => Promise<void>;
  vaultIndexCache?: PluginVaultIndexCache;
}

export class RuleEditorModal extends BaseModal {
  private ruleOptions: RuleEditorModalOptions;
  private workingRule: RuleV2;
  private originalRule: RuleV2;
  private isForceClosing = false;
  private discardRequested = false;
  private dragDropManager: DragDropManager | null = null;
  private triggersContainer: HTMLElement | null = null;
  private readonly isMobileLayout: boolean;
  private rowSuggests: SuggestRegistry[] = [];
  private destinationSuggest: DestroyableSuggest | null = null;
  private mobileView: RuleEditorMobileView | null = null;
  private readonly livePreview = createRuleLivePreview(300);
  private previewEl: HTMLElement | null = null;

  constructor(app: App, options: RuleEditorModalOptions) {
    const isMobileLayout = MobileUtils.isMobile();
    super(app, {
      title: isMobileLayout
        ? strings().modals.ruleEditorTitleMobile
        : strings().modals.ruleEditorTitleDesktop,
      useNativeTitle: isMobileLayout,
      size: 'large',
      cssClass: isMobileLayout
        ? 'advancedNoteMover-rule-editor-mobile-content'
        : 'advancedNoteMover-rule-editor-modal',
      mobileShellClass: 'advancedNoteMover-rule-editor--mobile',
      autoFocus: false, // Disable auto focus to prevent scroll issues on mobile
    });
    this.isMobileLayout = isMobileLayout;
    this.ruleOptions = options;
    const session = openEditor(options.rule);
    this.workingRule = session.draft;
    this.originalRule = session.saved;
  }

  protected createContent(): void {
    const { contentEl } = this;
    if (this.isMobileLayout) {
      this.mobileView = new RuleEditorMobileView({
        app: this.app,
        rule: this.workingRule,
        canDelete: Boolean(
          this.ruleOptions.isEditMode && this.ruleOptions.onDelete
        ),
        vaultIndexCache: this.ruleOptions.vaultIndexCache,
        onSave: () => void this.handleSave(),
        onCancel: () => void this.requestClose(),
        onDelete: () => void this.handleRemoveRule(),
        onDraftChange: () => this.schedulePreview(),
        renderLivePreview: parent => this.renderLivePreview(parent),
      });
      this.mobileView.render(contentEl);
      return;
    }
    this.createDesktopContent(contentEl);
  }

  private createDesktopContent(container: HTMLElement): void {
    // Name and Active Toggle Row
    this.createNameAndActiveRow(container);

    // Match Conditions Selector
    this.createMatchConditionsSelector(container);

    // Destination
    this.createDestinationInput(container);

    // Destination folder creation override
    this.createFolderCreationSelector(container);

    // Separator
    container.createEl('hr', {
      cls: 'advancedNoteMover-rule-editor-separator',
    });

    // Conditions Section
    this.createConditionsSection(container);

    // Separator
    container.createEl('hr', {
      cls: 'advancedNoteMover-rule-editor-separator',
    });

    // Footer Actions
    this.createFooterActions(container);
  }

  private createNameAndActiveRow(container: HTMLElement): void {
    const setting = new Setting(container).setName(
      strings().modals.ruleEditorName
    );
    renderRuleNameField(setting.controlEl, {
      value: this.workingRule.name,
      onChange: value => {
        this.workingRule.name = value;
      },
    });
    setting.addToggle(toggle =>
      toggle
        .setValue(this.workingRule.active)
        .setTooltip(
          this.workingRule.active
            ? strings().settings.rulesActive
            : strings().settings.rulesInactive
        )
        .onChange(value => {
          this.workingRule.active = value;
          this.schedulePreview();
          toggle.setTooltip(
            value
              ? strings().settings.rulesActive
              : strings().settings.rulesInactive
          );
        })
    );
  }

  private createMatchConditionsSelector(container: HTMLElement): void {
    const setting = new Setting(container).setName(
      strings().modals.ruleEditorMatch
    );
    const buttonContainer = setting.controlEl.createDiv({
      cls: 'advancedNoteMover-rule-aggregation-buttons',
    });
    const description = container.createDiv({
      cls: 'advancedNoteMover-rule-aggregation-description',
    });
    renderAggregationControl(buttonContainer, {
      value: this.workingRule.aggregation,
      buttonClass: 'advancedNoteMover-rule-aggregation-button',
      descriptionEl: description,
      onChange: value => {
        this.workingRule.aggregation = value;
        this.schedulePreview();
      },
    });
  }

  private createDestinationInput(container: HTMLElement): void {
    const destination = renderDestinationSetting(container, {
      app: this.app,
      value: this.workingRule.destination,
      placeholder: strings().modals.ruleEditorDestinationPlaceholder,
      onChange: value => {
        this.workingRule.destination = value;
      },
    });
    this.destinationSuggest = {
      destroy: () => destination.destroy(),
    };
    renderDestinationHelp(container, template => {
      this.workingRule.destination = template;
      destination.input.value = template;
    });
  }

  private createFolderCreationSelector(container: HTMLElement): void {
    new Setting(container)
      .setName(strings().modals.ruleEditorCreateFolderName)
      .setDesc(strings().modals.ruleEditorCreateFolderDesc)
      .addDropdown(dropdown =>
        dropdown
          .addOption('inherit', strings().modals.ruleEditorInherit)
          .addOption('always', strings().modals.ruleEditorAlwaysCreate)
          .addOption('never', strings().modals.ruleEditorNeverCreate)
          .setValue(getFolderCreationValue(this.workingRule))
          .onChange(value => {
            applyFolderCreationValue(
              this.workingRule,
              value as FolderCreationValue
            );
          })
      );
  }

  private createConditionsSection(container: HTMLElement): void {
    const section = container.createDiv({
      cls: 'advancedNoteMover-rule-conditions-section',
    });

    section.createEl('h3', {
      text: strings().modals.ruleEditorConditions,
      cls: 'advancedNoteMover-rule-conditions-title',
    });
    this.renderLivePreview(section);

    // Triggers container
    this.triggersContainer = section.createDiv({
      cls: 'advancedNoteMover-rule-triggers-container',
    });

    this.renderTriggers();

    // Add Condition Button
    new Setting(section).addButton(btn =>
      btn.setButtonText(strings().modals.ruleEditorAddCondition).onClick(() => {
        this.workingRule.triggers = addCondition(this.workingRule).triggers;
        this.renderTriggers();
        this.schedulePreview();
      })
    );
  }

  private renderTriggers(): void {
    if (!this.triggersContainer) return;

    this.triggersContainer.empty();
    this.destroyRowSuggests();

    if (this.dragDropManager) {
      this.dragDropManager.destroy();
      this.dragDropManager = null;
    }

    this.workingRule.triggers.forEach((_trigger, index) => {
      this.renderTriggerAt(index);
    });

    this.setupTriggersDragDrop();
  }

  /** Rebuilds one condition. Typing in its value field does not come through here. */
  private renderTriggerAt(index: number): void {
    const container = this.triggersContainer;
    const trigger = this.workingRule.triggers[index];
    if (!container || !trigger) {
      return;
    }
    this.rowSuggests[index]?.destroy();
    const suggests = new SuggestRegistry();
    this.rowSuggests[index] = suggests;
    renderConditionRow(container, {
      app: this.app,
      trigger,
      suggests,
      vaultIndexCache: this.ruleOptions.vaultIndexCache,
      onStructureChange: () => {
        this.renderTriggerAt(index);
        this.schedulePreview();
      },
      onDraftChange: () => this.schedulePreview(),
      onRemove: () => {
        this.workingRule.triggers = removeCondition(
          this.workingRule,
          index
        ).triggers;
        this.renderTriggers();
        this.schedulePreview();
      },
    });
    const row = container.lastElementChild;
    const current = container.children[index];
    if (row && current && row !== current) {
      current.replaceWith(row);
    }
  }

  private destroyRowSuggests(): void {
    for (const registry of this.rowSuggests) {
      registry.destroy();
    }
    this.rowSuggests = [];
  }

  private setupTriggersDragDrop(): void {
    if (!this.triggersContainer) return;

    this.dragDropManager = new DragDropManager(this.triggersContainer, {
      onReorder: (fromIndex: number, toIndex: number) => {
        // DragDropManager reports the insertion index before removal
        const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
        this.workingRule.triggers = reorderConditions(
          this.workingRule,
          fromIndex,
          adjustedToIndex
        ).triggers;
        this.renderTriggers();
        this.schedulePreview();
      },
      onMove: (index, direction) => {
        const next = index + direction;
        this.workingRule.triggers = reorderConditions(
          this.workingRule,
          index,
          next
        ).triggers;
        this.renderTriggers();
        this.schedulePreview();
      },
      onSave: async () => {
        // No additional action needed
        return Promise.resolve();
      },
      itemSelector: '.advancedNoteMover-rule-trigger-row',
      handleSelector: '.advancedNoteMover-drag-handle',
    });
  }

  private createFooterActions(container: HTMLElement): void {
    const footer = container.createDiv({
      cls: 'advancedNoteMover-rule-editor-footer advancedNoteMover-modal-footer',
    });

    if (this.ruleOptions.isEditMode && this.ruleOptions.onDelete) {
      const leftSide = footer.createDiv({
        cls: 'advancedNoteMover-rule-editor-footer-left',
      });
      const leftButtons = this.createButtonContainer(leftSide);
      this.createButton(
        leftButtons,
        strings().modals.ruleEditorRemoveRule,
        () => {
          void this.handleRemoveRule();
        },
        { isWarning: true }
      );
    }

    const rightSide = footer.createDiv({
      cls: 'advancedNoteMover-rule-editor-footer-right',
    });
    const rightButtons = this.createButtonContainer(rightSide);

    this.createButton(rightButtons, strings().common.cancel, () => {
      void this.requestClose();
    });

    this.createButton(
      rightButtons,
      strings().common.save,
      () => {
        void this.handleSave();
      },
      { isPrimary: true }
    );
  }

  private async handleSave(): Promise<void> {
    const error = validateRule(this.workingRule);
    if (error) {
      NoticeManager.error(error);
      return;
    }
    await this.ruleOptions.onSave(this.workingRule);
    this.isForceClosing = true;
    super.close();
  }

  private async handleRemoveRule(): Promise<void> {
    const ruleLabel = toMarkdownInlineCode(this.workingRule.name);
    const confirmed = await ConfirmModal.show(this.app, {
      title: strings().modals.ruleEditorDeleteTitle,
      message: fill(strings().modals.confirmDeleteRule, { rule: ruleLabel }),
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

  private async requestClose(): Promise<void> {
    this.close();
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

  private renderLivePreview(parent: HTMLElement): void {
    this.previewEl = parent.createDiv({
      cls: 'advancedNoteMover-rule-live-preview',
    });
    this.schedulePreview();
  }

  private previewFiles() {
    const files = this.ruleOptions.vaultIndexCache
      ? this.ruleOptions.vaultIndexCache.getMarkdownFilesCached(this.app)
      : this.app.vault.getMarkdownFiles();
    return files.map(file =>
      fileMetadataFromCache(file, this.app.metadataCache.getFileCache(file))
    );
  }

  private schedulePreview(): void {
    const rule = this.workingRule;
    void this.livePreview.update(rule, this.previewFiles()).then(
      count => {
        this.previewEl?.setText(
          fill(strings().modals.ruleEditorLivePreview, {
            matches: plural(count, 'note'),
          })
        );
      },
      error => {
        if (!isAbortError(error)) {
          return;
        }
      }
    );
  }

  onClose(): void {
    this.livePreview.dispose();
    this.destroyRowSuggests();
    this.destinationSuggest?.destroy();
    this.destinationSuggest = null;
    this.mobileView?.destroy();
    this.mobileView = null;
    if (this.dragDropManager) {
      this.dragDropManager.destroy();
      this.dragDropManager = null;
    }
    super.onClose();
  }
}
