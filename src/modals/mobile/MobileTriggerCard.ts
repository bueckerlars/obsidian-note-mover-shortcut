import { Trigger, CriteriaType, Operator } from '../../types/RuleV2';
import { App } from 'obsidian';
import { setIcon } from 'obsidian';
import { MobileUtils } from '../../utils/MobileUtils';
import { FolderSuggest } from '../../settings/suggesters/FolderSuggest';
import { TagSuggest } from '../../settings/suggesters/TagSuggest';
import { PropertySuggest } from '../../settings/suggesters/PropertySuggest';
import { PropertyValueSuggest } from '../../settings/suggesters/PropertyValueSuggest';
import {
  getDefaultOperatorForCriteriaType,
  getPropertyTypeFromVault,
  operatorRequiresValue,
  getOperatorsForCriteriaType,
  getOperatorsForPropertyType,
} from '../../utils/OperatorMapping';

export interface MobileTriggerCardCallbacks {
  onCriteriaTypeChange?: (value: CriteriaType) => void;
  onOperatorChange?: (value: Operator) => void;
  onPropertyNameChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRender?: () => void; // Called when trigger needs to be re-rendered
}

/**
 * Mobile-optimized trigger card component
 * Card-based layout for individual trigger conditions
 */
export class MobileTriggerCard {
  private cardEl: HTMLElement;
  private headerEl: HTMLElement;
  private fieldsContainer: HTMLElement;
  private criteriaTypeSelect: HTMLSelectElement;
  private operatorSelect: HTMLSelectElement;
  private propertyNameInput: HTMLInputElement | null = null;
  private valueInput: HTMLInputElement | null = null;
  private moveUpButton: HTMLButtonElement | null = null;
  private moveDownButton: HTMLButtonElement | null = null;
  private deleteButton: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    trigger: Trigger,
    callbacks: MobileTriggerCardCallbacks,
    app: App
  ) {
    // Create card
    this.cardEl = container.createDiv({
      cls: 'noteMover-mobile-trigger-card',
    });

    // Create header with move buttons and delete button
    this.headerEl = this.cardEl.createDiv({
      cls: 'noteMover-mobile-trigger-card-header',
    });

    // Move buttons container
    const moveButtonsContainer = this.headerEl.createDiv({
      cls: 'noteMover-mobile-trigger-move-buttons',
    });

    // Move Up button
    if (callbacks.canMoveUp !== false) {
      const upButton = MobileUtils.createMoveButton(
        moveButtonsContainer,
        'up',
        async () => {
          if (callbacks.onMoveUp) {
            await callbacks.onMoveUp();
          }
        },
        false
      );
      if (upButton) {
        this.moveUpButton = upButton;
      }
    }

    // Move Down button
    if (callbacks.canMoveDown !== false) {
      const downButton = MobileUtils.createMoveButton(
        moveButtonsContainer,
        'down',
        async () => {
          if (callbacks.onMoveDown) {
            await callbacks.onMoveDown();
          }
        },
        false
      );
      if (downButton) {
        this.moveDownButton = downButton;
      }
    }

    // Delete button
    const deleteBtnContainer = this.headerEl.createDiv({
      cls: 'noteMover-mobile-trigger-delete-container',
    });
    this.deleteButton = deleteBtnContainer.createEl('button', {
      cls: 'noteMover-mobile-trigger-delete-btn',
    });
    setIcon(this.deleteButton, 'x');
    this.deleteButton.addEventListener('click', async () => {
      if (callbacks.onDelete) {
        await callbacks.onDelete();
      }
    });

    // Create fields container
    this.fieldsContainer = this.cardEl.createDiv({
      cls: 'noteMover-mobile-trigger-fields',
    });

    // CriteriaType Dropdown
    const criteriaLabel = this.fieldsContainer.createDiv({
      cls: 'noteMover-mobile-trigger-field-label',
      text: 'Criteria Type',
    });
    this.criteriaTypeSelect = this.fieldsContainer.createEl('select', {
      cls: 'noteMover-mobile-text-input',
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
      const option = this.criteriaTypeSelect.createEl('option', {
        value: ct,
        text: ct,
      });
      if (trigger.criteriaType === ct) {
        option.selected = true;
      }
    });
    this.criteriaTypeSelect.addEventListener('change', () => {
      trigger.criteriaType = this.criteriaTypeSelect.value as CriteriaType;
      trigger.operator = getDefaultOperatorForCriteriaType(
        trigger.criteriaType
      );
      if (trigger.criteriaType !== 'properties') {
        delete trigger.propertyName;
        delete trigger.propertyType;
      }
      if (callbacks.onCriteriaTypeChange) {
        callbacks.onCriteriaTypeChange(trigger.criteriaType);
      }
      if (callbacks.onRender) {
        callbacks.onRender();
      }
    });

    // Operator Dropdown (will be populated by populateOperatorDropdown)
    const operatorLabel = this.fieldsContainer.createDiv({
      cls: 'noteMover-mobile-trigger-field-label',
      text: 'Operator',
    });
    this.operatorSelect = this.fieldsContainer.createEl('select', {
      cls: 'noteMover-mobile-text-input',
    });
    this.populateOperatorDropdown(trigger, app);
    this.operatorSelect.addEventListener('change', () => {
      trigger.operator = this.operatorSelect.value as Operator;
      if (callbacks.onOperatorChange) {
        callbacks.onOperatorChange(trigger.operator);
      }
      if (callbacks.onRender) {
        callbacks.onRender();
      }
    });

    // Property-specific fields (only shown for properties criteria)
    if (trigger.criteriaType === 'properties') {
      const propertyLabel = this.fieldsContainer.createDiv({
        cls: 'noteMover-mobile-trigger-field-label',
        text: 'Property Name',
      });
      this.propertyNameInput = this.fieldsContainer.createEl('input', {
        type: 'text',
        cls: 'noteMover-mobile-text-input',
        placeholder: 'Property Name',
        value: trigger.propertyName || '',
      });

      new PropertySuggest(app, this.propertyNameInput);

      this.propertyNameInput.addEventListener('input', () => {
        trigger.propertyName = this.propertyNameInput!.value;
        const detectedType = getPropertyTypeFromVault(
          app,
          trigger.propertyName
        );
        if (detectedType) {
          trigger.propertyType = detectedType;
          if (callbacks.onRender) {
            callbacks.onRender();
          }
        }
        if (callbacks.onPropertyNameChange) {
          callbacks.onPropertyNameChange(trigger.propertyName || '');
        }
      });
    }

    // Value Input (only if operator requires value)
    if (operatorRequiresValue(trigger.operator)) {
      const valueLabel = this.fieldsContainer.createDiv({
        cls: 'noteMover-mobile-trigger-field-label',
        text: trigger.criteriaType === 'tag' ? 'Tag' : 'Value',
      });
      this.valueInput = this.fieldsContainer.createEl('input', {
        type: 'text',
        cls: 'noteMover-mobile-text-input',
        placeholder: trigger.criteriaType === 'tag' ? '#tag' : 'Value',
        value: trigger.value || '',
      });
      this.valueInput.addEventListener('input', () => {
        trigger.value = this.valueInput!.value;
        if (callbacks.onValueChange) {
          callbacks.onValueChange(trigger.value);
        }
      });

      // Add suggesters based on criteriaType
      if (trigger.criteriaType === 'tag') {
        new TagSuggest(app, this.valueInput);
      } else if (trigger.criteriaType === 'folder') {
        new FolderSuggest(app, this.valueInput);
      } else if (
        trigger.criteriaType === 'properties' &&
        trigger.propertyName &&
        trigger.propertyType
      ) {
        new PropertyValueSuggest(
          app,
          this.valueInput,
          trigger.propertyName,
          trigger.propertyType
        );
      }
    }
  }

  private populateOperatorDropdown(trigger: Trigger, app: App): void {
    this.operatorSelect.empty();

    let operators: Operator[];
    if (trigger.criteriaType === 'properties' && trigger.propertyType) {
      operators = getOperatorsForPropertyType(trigger.propertyType);
    } else {
      operators = getOperatorsForCriteriaType(trigger.criteriaType);
    }

    operators.forEach(op => {
      const option = this.operatorSelect.createEl('option', {
        value: op,
        text: op,
      });
      if (trigger.operator === op) {
        option.selected = true;
      }
    });
  }

  updateOperatorDropdown(trigger: Trigger, app: App): void {
    this.populateOperatorDropdown(trigger, app);
  }

  updateValueField(
    trigger: Trigger,
    app: App,
    callbacks: MobileTriggerCardCallbacks
  ): void {
    const needsValue = operatorRequiresValue(trigger.operator);
    const hasValue = this.valueInput !== null;

    if (needsValue && !hasValue) {
      // Create value input
      const valueLabel = this.fieldsContainer.createDiv({
        cls: 'noteMover-mobile-trigger-field-label',
        text: trigger.criteriaType === 'tag' ? 'Tag' : 'Value',
      });
      this.valueInput = this.fieldsContainer.createEl('input', {
        type: 'text',
        cls: 'noteMover-mobile-text-input',
        placeholder: trigger.criteriaType === 'tag' ? '#tag' : 'Value',
        value: trigger.value || '',
      });
      this.valueInput.addEventListener('input', () => {
        trigger.value = this.valueInput!.value;
        if (callbacks.onValueChange) {
          callbacks.onValueChange(trigger.value);
        }
      });

      // Add suggesters
      if (trigger.criteriaType === 'tag') {
        new TagSuggest(app, this.valueInput);
      } else if (trigger.criteriaType === 'folder') {
        new FolderSuggest(app, this.valueInput);
      } else if (
        trigger.criteriaType === 'properties' &&
        trigger.propertyName &&
        trigger.propertyType
      ) {
        new PropertyValueSuggest(
          app,
          this.valueInput,
          trigger.propertyName,
          trigger.propertyType
        );
      }
    } else if (!needsValue && hasValue) {
      // Remove value input and its label
      const valueLabel = this.valueInput!.previousElementSibling;
      if (
        valueLabel &&
        valueLabel.classList.contains('noteMover-mobile-trigger-field-label')
      ) {
        valueLabel.remove();
      }
      this.valueInput!.remove();
      this.valueInput = null;
    } else if (needsValue && hasValue && this.valueInput) {
      // Update existing value input
      this.valueInput.value = trigger.value || '';
    }
  }

  updatePropertyField(
    trigger: Trigger,
    app: App,
    callbacks: MobileTriggerCardCallbacks
  ): void {
    const needsProperty = trigger.criteriaType === 'properties';
    const hasProperty = this.propertyNameInput !== null;

    if (needsProperty && !hasProperty) {
      // Create property input before operator select
      const operatorLabel = this.operatorSelect.previousElementSibling;
      const propertyLabel = this.fieldsContainer.createDiv({
        cls: 'noteMover-mobile-trigger-field-label',
        text: 'Property Name',
      });
      this.propertyNameInput = this.fieldsContainer.createEl('input', {
        type: 'text',
        cls: 'noteMover-mobile-text-input',
        placeholder: 'Property Name',
        value: trigger.propertyName || '',
      });

      // Insert before operator label
      if (operatorLabel) {
        this.fieldsContainer.insertBefore(propertyLabel, operatorLabel);
        this.fieldsContainer.insertBefore(
          this.propertyNameInput,
          operatorLabel
        );
      }

      new PropertySuggest(app, this.propertyNameInput);
      this.propertyNameInput.addEventListener('input', () => {
        trigger.propertyName = this.propertyNameInput!.value;
        const detectedType = getPropertyTypeFromVault(
          app,
          trigger.propertyName
        );
        if (detectedType) {
          trigger.propertyType = detectedType;
          if (callbacks.onRender) {
            callbacks.onRender();
          }
        }
        if (callbacks.onPropertyNameChange) {
          callbacks.onPropertyNameChange(trigger.propertyName || '');
        }
      });
    } else if (!needsProperty && hasProperty) {
      // Remove property input and its label
      const propertyLabel = this.propertyNameInput!.previousElementSibling;
      if (
        propertyLabel &&
        propertyLabel.classList.contains('noteMover-mobile-trigger-field-label')
      ) {
        propertyLabel.remove();
      }
      this.propertyNameInput!.remove();
      this.propertyNameInput = null;
    } else if (needsProperty && hasProperty && this.propertyNameInput) {
      // Update existing property input
      this.propertyNameInput.value = trigger.propertyName || '';
    }
  }

  getCardElement(): HTMLElement {
    return this.cardEl;
  }

  getCriteriaTypeSelect(): HTMLSelectElement {
    return this.criteriaTypeSelect;
  }

  getOperatorSelect(): HTMLSelectElement {
    return this.operatorSelect;
  }

  getPropertyNameInput(): HTMLInputElement | null {
    return this.propertyNameInput;
  }

  getValueInput(): HTMLInputElement | null {
    return this.valueInput;
  }
}
