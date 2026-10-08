import { App, Setting, setIcon } from 'obsidian';
import { BaseModal } from './BaseModal';
import {
  RuleV2,
  Trigger,
  AggregationType,
  CriteriaType,
  Operator,
} from '../types/RuleV2';
import { FolderSuggest } from '../settings/suggesters/FolderSuggest';
import { PropertySuggest } from '../settings/suggesters/PropertySuggest';
import { DragDropManager } from '../utils/DragDropManager';
import { MobileUtils } from '../utils/MobileUtils';
import { operatorRequiresValue } from '../utils/OperatorMapping';
import type { PluginVaultIndexCache } from '../infrastructure/cache/plugin-vault-index-cache';
import { ConfirmModal } from './ConfirmModal';
import { NoticeManager } from '../utils/NoticeManager';
import { SETTINGS_CONSTANTS } from '../config/constants';
import { toMarkdownInlineCode } from '../utils/markdown-confirm';
import { RuleEditorMobileView } from './rule-editor/RuleEditorMobileView';
import {
  AGGREGATION_TYPES,
  CRITERIA_TYPES,
  DESTINATION_DESCRIPTION,
  FolderCreationValue,
  applyCriteriaType,
  applyFolderCreationValue,
  applyPropertyName,
  attachValueSuggester,
  capitalize,
  createDefaultTrigger,
  getFolderCreationValue,
  getOperatorsForTrigger,
  getValuePlaceholder,
  moveTrigger,
  removeTrigger,
  validateRule,
} from './rule-editor/ruleEditorShared';

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
  private dragDropManager: DragDropManager | null = null;
  private triggersContainer: HTMLElement | null = null;
  private readonly isMobileLayout: boolean;

  constructor(app: App, options: RuleEditorModalOptions) {
    const isMobileLayout = MobileUtils.isMobile();
    super(app, {
      title: isMobileLayout ? 'Rule editor' : 'Rule Editor',
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
    this.workingRule = structuredClone(options.rule);
    this.originalRule = structuredClone(options.rule);
  }

  protected createContent(): void {
    const { contentEl } = this;
    if (this.isMobileLayout) {
      new RuleEditorMobileView({
        app: this.app,
        rule: this.workingRule,
        canDelete: Boolean(
          this.ruleOptions.isEditMode && this.ruleOptions.onDelete
        ),
        vaultIndexCache: this.ruleOptions.vaultIndexCache,
        onSave: () => void this.handleSave(),
        onCancel: () => void this.requestClose(),
        onDelete: () => void this.handleRemoveRule(),
      }).render(contentEl);
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
    new Setting(container)
      .setName('Name')
      .addText(text =>
        text
          .setPlaceholder('Enter rule name')
          .setValue(this.workingRule.name)
          .onChange(value => {
            this.workingRule.name = value;
          })
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.workingRule.active)
          .setTooltip(
            this.workingRule.active ? 'Rule is active' : 'Rule is inactive'
          )
          .onChange(value => {
            this.workingRule.active = value;
            toggle.setTooltip(value ? 'Rule is active' : 'Rule is inactive');
          })
      );
  }

  private createMatchConditionsSelector(container: HTMLElement): void {
    const setting = new Setting(container).setName('Match conditions');

    const buttonContainer = setting.controlEl.createDiv({
      cls: 'advancedNoteMover-rule-aggregation-buttons',
    });

    AGGREGATION_TYPES.forEach((agg: AggregationType) => {
      const button = buttonContainer.createEl('button', {
        text: capitalize(agg),
        cls: 'advancedNoteMover-rule-aggregation-button',
      });

      if (this.workingRule.aggregation === agg) {
        button.addClass('is-active');
      }

      button.onclick = () => {
        this.workingRule.aggregation = agg;
        // Update button states
        buttonContainer
          .querySelectorAll('.advancedNoteMover-rule-aggregation-button')
          .forEach(btn => {
            btn.removeClass('is-active');
          });
        button.addClass('is-active');
      };
    });
  }

  private createDestinationInput(container: HTMLElement): void {
    const setting = new Setting(container)
      .setName('Destination')
      .addSearch(cb => {
        new FolderSuggest(this.app, cb.inputEl);
        cb.setPlaceholder(
          'Example: Personal/Tasks/{{property.status}} or {{tag.tasks/personal}}/Incoming'
        )
          .setValue(this.workingRule.destination)
          .onChange(value => {
            this.workingRule.destination = value;
          });
      });

    setting.settingEl.addClass('advancedNoteMover-rule-destination-setting');

    // Move description below the input to give the input more horizontal space
    const descriptionEl = container.createDiv({
      cls: 'advancedNoteMover-rule-destination-description',
      text: DESTINATION_DESCRIPTION,
    });

    // Visually and accessibly associate the description with the input
    const descriptionId = 'advancedNoteMover-rule-destination-description';
    descriptionEl.setAttr('id', descriptionId);
    setting.settingEl
      .querySelector('input')
      ?.setAttribute('aria-describedby', descriptionId);
  }

  private createFolderCreationSelector(container: HTMLElement): void {
    new Setting(container)
      .setName(SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_NAME)
      .setDesc(SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_DESC)
      .addDropdown(dropdown =>
        dropdown
          .addOption(
            'inherit',
            SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_INHERIT
          )
          .addOption(
            'always',
            SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_ALWAYS
          )
          .addOption(
            'never',
            SETTINGS_CONSTANTS.UI_TEXTS.RULE_CREATE_FOLDER_NEVER
          )
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
      text: 'Conditions:',
      cls: 'advancedNoteMover-rule-conditions-title',
    });

    // Triggers container
    this.triggersContainer = section.createDiv({
      cls: 'advancedNoteMover-rule-triggers-container',
    });

    this.renderTriggers();

    // Add Condition Button
    new Setting(section).addButton(btn =>
      btn.setButtonText('+ add condition').onClick(() => {
        this.workingRule.triggers.push(createDefaultTrigger());
        this.renderTriggers();
      })
    );
  }

  private renderTriggers(): void {
    if (!this.triggersContainer) return;

    this.triggersContainer.empty();

    // Clean up existing drag drop manager
    if (this.dragDropManager) {
      this.dragDropManager.destroy();
      this.dragDropManager = null;
    }

    this.workingRule.triggers.forEach((trigger, index) => {
      this.createTriggerRow(this.triggersContainer!, trigger, index);
    });

    // Setup drag & drop for triggers
    this.setupTriggersDragDrop();
  }

  private createTriggerRow(
    container: HTMLElement,
    trigger: Trigger,
    index: number
  ): void {
    const row = container.createDiv({
      cls: 'advancedNoteMover-rule-trigger-row',
    });

    // Delete button (left side)
    const deleteBtn = row.createEl('button', {
      cls: 'advancedNoteMover-rule-trigger-delete-btn clickable-icon',
    });
    setIcon(deleteBtn, 'x');
    deleteBtn.onclick = () => {
      removeTrigger(this.workingRule.triggers, index);
      this.renderTriggers();
    };

    // CriteriaType Dropdown
    const criteriaTypeSelect = row.createEl('select', {
      cls: 'dropdown advancedNoteMover-rule-criteria-type',
    });
    CRITERIA_TYPES.forEach(ct => {
      const option = criteriaTypeSelect.createEl('option', {
        value: ct,
        text: ct,
      });
      if (trigger.criteriaType === ct) {
        option.selected = true;
      }
    });
    criteriaTypeSelect.onchange = () => {
      applyCriteriaType(trigger, criteriaTypeSelect.value as CriteriaType);
      this.renderTriggers(); // Re-render to update operator dropdown
    };

    // Operator Dropdown (dynamically populated based on criteriaType)
    const operatorSelect = row.createEl('select', {
      cls: 'dropdown advancedNoteMover-rule-operator',
    });
    this.populateOperatorDropdown(operatorSelect, trigger);

    // Property-specific fields (only shown for properties criteria)
    if (trigger.criteriaType === 'properties') {
      const propertyNameInput = row.createEl('input', {
        type: 'text',
        cls: 'advancedNoteMover-rule-property-name',
        placeholder: 'Property Name',
        value: trigger.propertyName || '',
      });

      new PropertySuggest(this.app, propertyNameInput);

      propertyNameInput.oninput = () => {
        const detected = applyPropertyName(
          this.app,
          trigger,
          propertyNameInput.value,
          this.ruleOptions.vaultIndexCache
        );
        if (detected) {
          this.renderTriggers(); // Re-render to update operator dropdown
        }
      };
    }

    // Value input (only when operator requires a value)
    if (operatorRequiresValue(trigger.operator)) {
      const valueInput = row.createEl('input', {
        type: 'text',
        cls: 'advancedNoteMover-rule-trigger-value',
        placeholder: getValuePlaceholder(trigger),
        value: trigger.value,
      });
      valueInput.oninput = () => {
        trigger.value = valueInput.value;
      };

      attachValueSuggester(
        this.app,
        valueInput,
        trigger,
        this.ruleOptions.vaultIndexCache
      );
    } else {
      row.addClass('advancedNoteMover-no-value-field');
    }

    // Drag handle (right side)
    const handleContainer = row.createDiv({
      cls: 'advancedNoteMover-drag-handle-container',
    });
    const handle = DragDropManager.createDragHandle();
    handleContainer.appendChild(handle);
  }

  /**
   * Populates the operator dropdown based on the trigger's criteria type and property type
   */
  private populateOperatorDropdown(
    select: HTMLSelectElement,
    trigger: Trigger
  ): void {
    select.empty();

    getOperatorsForTrigger(trigger).forEach(op => {
      const option = select.createEl('option', {
        value: op,
        text: op,
      });
      if (trigger.operator === op) {
        option.selected = true;
      }
    });

    select.onchange = () => {
      trigger.operator = select.value as Operator;
      // Re-render to show/hide value field based on operator
      this.renderTriggers();
    };
  }

  private setupTriggersDragDrop(): void {
    if (!this.triggersContainer) return;

    this.dragDropManager = new DragDropManager(this.triggersContainer, {
      onReorder: (fromIndex: number, toIndex: number) => {
        // DragDropManager reports the insertion index before removal
        const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
        moveTrigger(this.workingRule.triggers, fromIndex, adjustedToIndex);

        // Manually move the DOM element
        const items = Array.from(
          this.triggersContainer!.querySelectorAll(
            '.advancedNoteMover-rule-trigger-row'
          )
        );
        const movedElement = items[fromIndex] as HTMLElement;

        if (movedElement) {
          // Remove the element from its current position
          movedElement.remove();

          // Insert at the new position
          const allItems = Array.from(
            this.triggersContainer!.querySelectorAll(
              '.advancedNoteMover-rule-trigger-row'
            )
          );

          if (adjustedToIndex >= allItems.length) {
            // Insert at the end
            this.triggersContainer!.appendChild(movedElement);
          } else {
            // Insert before the element at adjustedToIndex
            const referenceElement = allItems[adjustedToIndex];
            referenceElement.before(movedElement);
          }
        }
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
        'Remove rule',
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

    this.createButton(rightButtons, 'Cancel', () => {
      void this.requestClose();
    });

    this.createButton(
      rightButtons,
      'Save',
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
      title: SETTINGS_CONSTANTS.UI_TEXTS.DELETE_RULE_TITLE,
      message: `Are you sure you want to delete the rule ${ruleLabel}?\n\nThis action cannot be undone.`,
      confirmText: SETTINGS_CONSTANTS.UI_TEXTS.DELETE_RULE_CONFIRM,
      cancelText: 'Cancel',
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
      title: SETTINGS_CONSTANTS.UI_TEXTS.DISCARD_CHANGES_TITLE,
      message: SETTINGS_CONSTANTS.UI_TEXTS.DISCARD_CHANGES_MESSAGE,
      confirmText: SETTINGS_CONSTANTS.UI_TEXTS.DISCARD_CHANGES_CONFIRM,
      cancelText: 'Cancel',
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
    void this.confirmDiscardAndClose();
  }

  onClose(): void {
    // Clean up drag drop manager
    if (this.dragDropManager) {
      this.dragDropManager.destroy();
      this.dragDropManager = null;
    }
    super.onClose();
  }
}
