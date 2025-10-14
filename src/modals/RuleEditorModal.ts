import { App, Setting, DropdownComponent } from 'obsidian';
import { BaseModal } from './BaseModal';
import {
  RuleV2,
  Trigger,
  AggregationType,
  CriteriaType,
  RuleType,
} from '../types/RuleV2';
import { FolderSuggest } from '../settings/suggesters/FolderSuggest';
import { TagSuggest } from '../settings/suggesters/TagSuggest';
import { DragDropManager } from '../utils/DragDropManager';

interface RuleEditorModalOptions {
  rule: RuleV2;
  isEditMode: boolean;
  onSave: (rule: RuleV2) => Promise<void>;
  onDelete?: () => Promise<void>;
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
      cssClass: 'rule-editor-modal',
    });
    this.ruleOptions = options;
    // Create a working copy of the rule
    this.workingRule = JSON.parse(JSON.stringify(options.rule));
  }

  protected createContent(): void {
    const { contentEl } = this;

    // Name and Active Toggle Row
    this.createNameAndActiveRow(contentEl);

    // Match Conditions Selector
    this.createMatchConditionsSelector(contentEl);

    // Destination
    this.createDestinationInput(contentEl);

    // Separator
    contentEl.createEl('hr', { cls: 'rule-editor-separator' });

    // Conditions Section
    this.createConditionsSection(contentEl);

    // Separator
    contentEl.createEl('hr', { cls: 'rule-editor-separator' });

    // Footer Actions
    this.createFooterActions(contentEl);
  }

  private createNameAndActiveRow(container: HTMLElement): void {
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
      cls: 'rule-aggregation-buttons',
    });

    const aggregations: AggregationType[] = ['all', 'any', 'none'];
    aggregations.forEach(agg => {
      const button = buttonContainer.createEl('button', {
        text: agg.charAt(0).toUpperCase() + agg.slice(1),
        cls: 'rule-aggregation-button',
      });

      if (this.workingRule.aggregation === agg) {
        button.addClass('is-active');
      }

      button.onclick = () => {
        this.workingRule.aggregation = agg;
        // Update button states
        buttonContainer
          .querySelectorAll('.rule-aggregation-button')
          .forEach(btn => {
            btn.removeClass('is-active');
          });
        button.addClass('is-active');
      };
    });
  }

  private createDestinationInput(container: HTMLElement): void {
    new Setting(container)
      .setName('Destination')
      .setDesc('Folder where files matching this rule will be moved')
      .addSearch(cb => {
        new FolderSuggest(this.app, cb.inputEl);
        cb.setPlaceholder('Example: folder1/folder2')
          .setValue(this.workingRule.destination)
          .onChange(value => {
            this.workingRule.destination = value;
          });
        // Make search input wider
        cb.inputEl.style.width = '100%';
      });
  }

  private createConditionsSection(container: HTMLElement): void {
    const section = container.createDiv({ cls: 'rule-conditions-section' });

    section.createEl('h3', {
      text: 'Conditions:',
      cls: 'rule-conditions-title',
    });

    // Triggers container
    this.triggersContainer = section.createDiv({
      cls: 'rule-triggers-container',
    });

    this.renderTriggers();

    // Add Condition Button
    new Setting(section).addButton(btn =>
      btn.setButtonText('+ Add Condition').onClick(() => {
        this.workingRule.triggers.push({
          criteriaType: 'tag',
          ruleType: 'contains',
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

    // Setup drag & drop for triggers (always, even with single trigger for better UX)
    this.setupTriggersDragDrop();
  }

  private createTriggerRow(
    container: HTMLElement,
    trigger: Trigger,
    index: number
  ): void {
    const row = container.createDiv({ cls: 'rule-trigger-row' });

    // Delete button (left side)
    const deleteBtn = row.createEl('button', {
      cls: 'rule-trigger-delete-btn clickable-icon',
    });
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    deleteBtn.onclick = () => {
      this.workingRule.triggers.splice(index, 1);
      // Prevent saving with empty triggers
      if (this.workingRule.triggers.length === 0) {
        this.workingRule.triggers.push({
          criteriaType: 'tag',
          ruleType: 'contains',
          value: '',
        });
      }
      this.renderTriggers();
    };

    // CriteriaType Dropdown
    const criteriaTypeSelect = row.createEl('select', {
      cls: 'dropdown rule-criteria-type',
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
    };

    // RuleType Dropdown
    const ruleTypeSelect = row.createEl('select', {
      cls: 'dropdown rule-rule-type',
    });
    const ruleTypes: RuleType[] = [
      'is',
      'is not',
      'contains',
      'starts with',
      'ends with',
      'match regex',
      'does not contain',
      'does not starts with',
      'does not ends with',
      'does not match regex',
    ];
    ruleTypes.forEach(rt => {
      const option = ruleTypeSelect.createEl('option', { value: rt, text: rt });
      if (trigger.ruleType === rt) {
        option.selected = true;
      }
    });
    ruleTypeSelect.onchange = () => {
      trigger.ruleType = ruleTypeSelect.value as RuleType;
    };

    // Value Input (with contextual suggester)
    const valueInput = row.createEl('input', {
      type: 'text',
      cls: 'rule-trigger-value',
      placeholder: 'Value',
      value: trigger.value,
    });
    valueInput.oninput = () => {
      trigger.value = valueInput.value;
    };

    // Add suggesters based on criteriaType
    if (trigger.criteriaType === 'tag') {
      new TagSuggest(this.app, valueInput);
    } else if (trigger.criteriaType === 'folder') {
      new FolderSuggest(this.app, valueInput);
    }

    // Drag handle (right side)
    const handleContainer = row.createDiv({ cls: 'drag-handle-container' });
    const handle = DragDropManager.createDragHandle();
    handleContainer.appendChild(handle);
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
          this.triggersContainer!.querySelectorAll('.rule-trigger-row')
        );
        const movedElement = items[fromIndex] as HTMLElement;

        if (movedElement) {
          // Remove the element from its current position
          movedElement.remove();

          // Insert at the new position
          const allItems = Array.from(
            this.triggersContainer!.querySelectorAll('.rule-trigger-row')
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
      itemSelector: '.rule-trigger-row',
      handleSelector: '.drag-handle',
    });
  }

  private createFooterActions(container: HTMLElement): void {
    const footer = container.createDiv({ cls: 'rule-editor-footer' });

    // Remove Rule button (only in edit mode)
    if (this.ruleOptions.isEditMode && this.ruleOptions.onDelete) {
      const leftSide = footer.createDiv({ cls: 'rule-editor-footer-left' });
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
    const rightSide = footer.createDiv({ cls: 'rule-editor-footer-right' });

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
      if (!trigger.value || trigger.value.trim() === '') {
        alert(`Condition ${i + 1}: Value cannot be empty.`);
        return false;
      }

      // Validate regex if applicable
      if (
        trigger.ruleType === 'match regex' ||
        trigger.ruleType === 'does not match regex'
      ) {
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
