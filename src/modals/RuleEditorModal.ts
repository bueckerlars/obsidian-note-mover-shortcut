import { App, Setting, DropdownComponent, setIcon } from 'obsidian';
import { BaseModal } from './BaseModal';
import {
  RuleV2,
  Trigger,
  AggregationType,
  CriteriaType,
  Operator,
} from '../types/RuleV2';
import { FolderSuggest } from '../settings/suggesters/FolderSuggest';
import { TagSuggest } from '../settings/suggesters/TagSuggest';
import { PropertySuggest } from '../settings/suggesters/PropertySuggest';
import { PropertyValueSuggest } from '../settings/suggesters/PropertyValueSuggest';
import { DragDropManager } from '../utils/DragDropManager';
import {
  getOperatorsForCriteriaType,
  getOperatorsForPropertyType,
  getDefaultOperatorForCriteriaType,
  isRegexOperator,
  operatorRequiresValue,
  getPropertyTypeFromVault,
} from '../utils/OperatorMapping';
import type { PluginVaultIndexCache } from '../infrastructure/cache/plugin-vault-index-cache';

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
  private dragDropManager: DragDropManager | null = null;
  private triggersContainer: HTMLElement | null = null;

  constructor(app: App, options: RuleEditorModalOptions) {
    super(app, {
      title: 'Rule Editor',
      size: 'large',
      cssClass: 'noteMover-rule-editor-modal',
      autoFocus: false, // Disable auto focus to prevent scroll issues on mobile
    });
    this.ruleOptions = options;
    // Create a working copy of the rule
    this.workingRule = JSON.parse(JSON.stringify(options.rule));
  }

  protected createContent(): void {
    const { contentEl } = this;
    this.createDesktopContent(contentEl);
  }

  private createDesktopContent(container: HTMLElement): void {
    // Name and Active Toggle Row
    this.createNameAndActiveRow(container);

    // Match Conditions Selector
    this.createMatchConditionsSelector(container);

    // Destination
    this.createDestinationInput(container);

    // Separator
    container.createEl('hr', { cls: 'noteMover-rule-editor-separator' });

    // Conditions Section
    this.createConditionsSection(container);

    // Separator
    container.createEl('hr', { cls: 'noteMover-rule-editor-separator' });

    // Footer Actions
    this.createFooterActions(container);
  }

  private createNameAndActiveRow(container: HTMLElement): void {
    // Desktop: Original layout
    const setting = new Setting(container)
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

    // Make text input wider
    const textInput = setting.controlEl.querySelector('input[type="text"]');
    if (textInput) {
      (textInput as HTMLElement).style.width = '100%';
    }
  }

  private createMatchConditionsSelector(container: HTMLElement): void {
    const setting = new Setting(container).setName('Match Conditions');

    const buttonContainer = setting.controlEl.createDiv({
      cls: 'noteMover-rule-aggregation-buttons',
    });

    const aggregations: AggregationType[] = ['all', 'any', 'none'];
    aggregations.forEach(agg => {
      const button = buttonContainer.createEl('button', {
        text: agg.charAt(0).toUpperCase() + agg.slice(1),
        cls: 'noteMover-rule-aggregation-button',
      });

      if (this.workingRule.aggregation === agg) {
        button.addClass('is-active');
      }

      button.onclick = () => {
        this.workingRule.aggregation = agg;
        // Update button states
        buttonContainer
          .querySelectorAll('.noteMover-rule-aggregation-button')
          .forEach(btn => {
            btn.removeClass('is-active');
          });
        button.addClass('is-active');
      };
    });
  }

  private createDestinationInput(container: HTMLElement): void {
    let destinationInputEl: any = null;

    const setting = new Setting(container)
      .setName('Destination')
      .addSearch(cb => {
        destinationInputEl = cb.inputEl;
        new FolderSuggest(this.app, cb.inputEl);
        cb.setPlaceholder(
          'Example: Personal/Tasks/{{property.status}} or {{tag.tasks/personal}}/Incoming'
        )
          .setValue(this.workingRule.destination)
          .onChange(value => {
            this.workingRule.destination = value;
          });
        // Make search input wider
        cb.inputEl.style.width = '100%';
      });

    // Move description below the input to give the input more horizontal space
    const descriptionText =
      'Folder or template where files matching this rule will be moved. Supports {{tag.*}} and {{property.*}} placeholders. Type {{tag. or {{property. to get template suggestions.';
    const descriptionEl = container.createDiv({
      cls: 'noteMover-rule-destination-description',
      text: descriptionText,
    });

    // Visually and accessibly associate the description with the input
    const descriptionId = 'noteMover-rule-destination-description';
    descriptionEl.setAttr('id', descriptionId);
    if (destinationInputEl) {
      destinationInputEl.setAttribute('aria-describedby', descriptionId);
    }
  }

  private createConditionsSection(container: HTMLElement): void {
    const section = container.createDiv({
      cls: 'noteMover-rule-conditions-section',
    });

    section.createEl('h3', {
      text: 'Conditions:',
      cls: 'noteMover-rule-conditions-title',
    });

    // Triggers container
    this.triggersContainer = section.createDiv({
      cls: 'noteMover-rule-triggers-container',
    });

    this.renderTriggers();

    // Add Condition Button
    const addButtonSetting = new Setting(section).addButton(btn =>
      btn.setButtonText('+ Add Condition').onClick(() => {
        this.workingRule.triggers.push({
          criteriaType: 'tag',
          operator: 'includes item',
          value: '',
        });
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
    // Desktop only
    const row = container.createDiv({ cls: 'noteMover-rule-trigger-row' });

    // Desktop: Delete button (left side)
    const deleteBtn = row.createEl('button', {
      cls: 'noteMover-rule-trigger-delete-btn clickable-icon',
    });
    setIcon(deleteBtn, 'x');
    deleteBtn.onclick = () => {
      this.workingRule.triggers.splice(index, 1);
      // Prevent saving with empty triggers
      if (this.workingRule.triggers.length === 0) {
        this.workingRule.triggers.push({
          criteriaType: 'tag',
          operator: 'includes item',
          value: '',
        });
      }
      this.renderTriggers();
    };

    // CriteriaType Dropdown
    const criteriaTypeSelect = row.createEl('select', {
      cls: 'dropdown noteMover-rule-criteria-type',
    });
    const criteriaTypes: CriteriaType[] = [
      'tag',
      'fileName',
      'folder',
      'created_at',
      'modified_at',
      'extension',
      'links',
      'embeds',
      'properties',
      'headings',
    ];
    criteriaTypes.forEach(ct => {
      const option = criteriaTypeSelect.createEl('option', {
        value: ct,
        text: ct,
      });
      if (trigger.criteriaType === ct) {
        option.selected = true;
      }
    });
    criteriaTypeSelect.onchange = () => {
      trigger.criteriaType = criteriaTypeSelect.value as CriteriaType;
      // Reset operator to default for new criteria type
      trigger.operator = getDefaultOperatorForCriteriaType(
        trigger.criteriaType
      );
      // Clear property fields if not properties criteria
      if (trigger.criteriaType !== 'properties') {
        delete trigger.propertyName;
        delete trigger.propertyType;
      }
      this.renderTriggers(); // Re-render to update operator dropdown
    };

    // Operator Dropdown (dynamically populated based on criteriaType)
    const operatorSelect = row.createEl('select', {
      cls: 'dropdown noteMover-rule-operator',
    });
    this.populateOperatorDropdown(operatorSelect, trigger);

    // Property-specific fields (only shown for properties criteria)
    let propertyNameInput: HTMLInputElement | null = null;

    if (trigger.criteriaType === 'properties') {
      propertyNameInput = row.createEl('input', {
        type: 'text',
        cls: 'noteMover-rule-property-name',
        placeholder: 'Property Name',
        value: trigger.propertyName || '',
      });

      // PropertySuggest hinzufügen
      new PropertySuggest(this.app, propertyNameInput);

      propertyNameInput.oninput = () => {
        trigger.propertyName = propertyNameInput!.value;

        // Automatische Typ-Erkennung
        const detectedType = getPropertyTypeFromVault(
          this.app,
          trigger.propertyName,
          this.ruleOptions.vaultIndexCache
        );
        if (detectedType) {
          trigger.propertyType = detectedType;
          this.renderTriggers(); // Re-render für Operator-Update
        }
      };
    }

    // Value Input (nur wenn Operator einen Wert benötigt)
    let valueInput: HTMLInputElement | null = null;
    if (operatorRequiresValue(trigger.operator)) {
      valueInput = row.createEl('input', {
        type: 'text',
        cls: 'noteMover-rule-trigger-value',
        placeholder: trigger.criteriaType === 'tag' ? '#tag' : 'Value',
        value: trigger.value,
      });
      valueInput.oninput = () => {
        trigger.value = valueInput!.value;
      };

      // Add suggesters based on criteriaType
      if (trigger.criteriaType === 'tag') {
        new TagSuggest(this.app, valueInput, this.ruleOptions.vaultIndexCache);
      } else if (trigger.criteriaType === 'folder') {
        new FolderSuggest(this.app, valueInput);
      } else if (
        trigger.criteriaType === 'properties' &&
        trigger.propertyName &&
        trigger.propertyType
      ) {
        // PropertyValueSuggest für Properties mit bekanntem Typ
        new PropertyValueSuggest(
          this.app,
          valueInput,
          trigger.propertyName,
          trigger.propertyType,
          this.ruleOptions.vaultIndexCache
        );
      }
    }

    // Add CSS class to row based on whether value field is present
    if (!operatorRequiresValue(trigger.operator)) {
      row.addClass('noteMover-no-value-field');
    }

    // Drag handle (right side)
    const handleContainer = row.createDiv({
      cls: 'noteMover-drag-handle-container',
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

    let operators: Operator[];

    if (trigger.criteriaType === 'properties' && trigger.propertyType) {
      operators = getOperatorsForPropertyType(trigger.propertyType);
    } else {
      operators = getOperatorsForCriteriaType(trigger.criteriaType);
    }

    operators.forEach(op => {
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
        // Update data array
        const [movedTrigger] = this.workingRule.triggers.splice(fromIndex, 1);
        // Adjust toIndex if moving down (because we removed an element)
        const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
        this.workingRule.triggers.splice(adjustedToIndex, 0, movedTrigger);

        // Manually move the DOM element
        const items = Array.from(
          this.triggersContainer!.querySelectorAll(
            '.noteMover-rule-trigger-row'
          )
        );
        const movedElement = items[fromIndex] as HTMLElement;

        if (movedElement) {
          // Remove the element from its current position
          movedElement.remove();

          // Insert at the new position
          const allItems = Array.from(
            this.triggersContainer!.querySelectorAll(
              '.noteMover-rule-trigger-row'
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
      itemSelector: '.noteMover-rule-trigger-row',
      handleSelector: '.noteMover-drag-handle',
    });
  }

  private createFooterActions(container: HTMLElement): void {
    const footer = container.createDiv({
      cls: 'noteMover-rule-editor-footer',
    });

    // Remove Rule button (only in edit mode)
    if (this.ruleOptions.isEditMode && this.ruleOptions.onDelete) {
      const leftSide = footer.createDiv({
        cls: 'noteMover-rule-editor-footer-left',
      });
      new Setting(leftSide).addButton(btn =>
        btn
          .setButtonText('Remove Rule')
          .setWarning()
          .onClick(async () => {
            const confirmed = confirm(
              `Are you sure you want to delete the rule "${this.workingRule.name}"?\n\nThis action cannot be undone.`
            );
            if (confirmed && this.ruleOptions.onDelete) {
              await this.ruleOptions.onDelete();
              this.close();
            }
          })
      );
    }

    // Right side: Cancel and Save
    const rightSide = footer.createDiv({
      cls: 'noteMover-rule-editor-footer-right',
    });

    new Setting(rightSide)
      .addButton(btn =>
        btn.setButtonText('Cancel').onClick(() => {
          this.close();
        })
      )
      .addButton(btn =>
        btn
          .setButtonText('Save')
          .setCta()
          .onClick(async () => {
            if (this.validateRule()) {
              await this.ruleOptions.onSave(this.workingRule);
              this.close();
            }
          })
      );
  }

  private validateRule(): boolean {
    // Validate name
    if (!this.workingRule.name || this.workingRule.name.trim() === '') {
      alert('Rule name cannot be empty.');
      return false;
    }

    // Validate destination
    if (
      !this.workingRule.destination ||
      this.workingRule.destination.trim() === ''
    ) {
      alert('Destination folder cannot be empty.');
      return false;
    }

    // Validate triggers
    if (this.workingRule.triggers.length === 0) {
      alert('At least one condition is required.');
      return false;
    }

    // Validate each trigger
    for (let i = 0; i < this.workingRule.triggers.length; i++) {
      const trigger = this.workingRule.triggers[i];

      // Only validate value if the operator requires one
      if (operatorRequiresValue(trigger.operator)) {
        if (!trigger.value || trigger.value.trim() === '') {
          alert(`Condition ${i + 1}: Value cannot be empty.`);
          return false;
        }

        // Validate regex if applicable
        if (isRegexOperator(trigger.operator)) {
          try {
            new RegExp(trigger.value);
          } catch (e) {
            alert(
              `Condition ${i + 1}: Invalid regex pattern: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
            return false;
          }
        }
      }
    }

    return true;
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
