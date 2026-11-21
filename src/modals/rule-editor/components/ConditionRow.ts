import type { App } from 'obsidian';
import { setIcon } from 'obsidian';
import { strings } from '../../../i18n/locale';
import type { PluginVaultIndexCache } from '../../../infrastructure/cache/plugin-vault-index-cache';
import { PropertySuggest } from '../../../settings/suggesters/PropertySuggest';
import type { SuggestRegistry } from '../../../settings/suggesters/suggestLifecycle';
import type { CriteriaType, Operator, Trigger } from '../../../types/RuleV2';
import { DragDropManager } from '../../../utils/DragDropManager';
import { operatorRequiresValue } from '../../../utils/OperatorMapping';
import {
  CRITERIA_TYPES,
  applyCriteriaType,
  applyPropertyName,
  attachValueSuggester,
  criteriaLabel,
  getOperatorsForTrigger,
  getValuePlaceholder,
} from '../ruleEditorShared';

export interface ConditionRowOptions {
  app: App;
  trigger: Trigger;
  suggests: SuggestRegistry;
  vaultIndexCache?: PluginVaultIndexCache;
  /** Criteria, operator, or property type changed. The value field does not call this. */
  onStructureChange: () => void;
  /** Value text changed. Does not redraw the row. */
  onDraftChange?: () => void;
  onRemove: () => void;
}

/** One condition. Typing in the value field updates that trigger only. */
export function renderConditionRow(
  parent: HTMLElement,
  options: ConditionRowOptions
): HTMLElement {
  const { trigger } = options;
  const row = parent.createDiv({
    cls: 'advancedNoteMover-rule-trigger-row',
  });

  const deleteBtn = row.createEl('button', {
    cls: 'advancedNoteMover-rule-trigger-delete-btn clickable-icon',
  });
  deleteBtn.setAttribute(
    'aria-label',
    strings().modals.ruleEditorDeleteCondition
  );
  setIcon(deleteBtn, 'x');
  deleteBtn.addEventListener('click', () => {
    options.onRemove();
  });

  const criteriaTypeSelect = row.createEl('select', {
    cls: 'dropdown advancedNoteMover-rule-criteria-type',
  });
  criteriaTypeSelect.setAttribute(
    'aria-label',
    strings().modals.ruleEditorCriteriaType
  );
  for (const criteriaType of CRITERIA_TYPES) {
    const option = criteriaTypeSelect.createEl('option', {
      value: criteriaType,
      text: criteriaLabel(criteriaType),
    });
    if (trigger.criteriaType === criteriaType) {
      option.selected = true;
    }
  }
  criteriaTypeSelect.addEventListener('change', () => {
    applyCriteriaType(trigger, criteriaTypeSelect.value as CriteriaType);
    options.onStructureChange();
  });

  const operatorSelect = row.createEl('select', {
    cls: 'dropdown advancedNoteMover-rule-operator',
  });
  operatorSelect.setAttribute(
    'aria-label',
    strings().modals.ruleEditorOperator
  );
  fillOperators(operatorSelect, trigger, () => {
    trigger.operator = operatorSelect.value as Operator;
    options.onStructureChange();
  });

  if (trigger.criteriaType === 'properties') {
    const propertyNameInput = row.createEl('input', {
      type: 'text',
      cls: 'advancedNoteMover-rule-property-name',
    });
    propertyNameInput.placeholder = strings().modals.ruleEditorPropertyName;
    propertyNameInput.value = trigger.propertyName || '';
    propertyNameInput.setAttribute(
      'aria-label',
      strings().modals.ruleEditorPropertyName
    );
    options.suggests.add(new PropertySuggest(options.app, propertyNameInput));
    propertyNameInput.addEventListener('input', () => {
      const detected = applyPropertyName(
        options.app,
        trigger,
        propertyNameInput.value,
        options.vaultIndexCache
      );
      if (detected) {
        options.onStructureChange();
      }
    });
  }

  if (operatorRequiresValue(trigger.operator)) {
    const valueInput = row.createEl('input', {
      type: 'text',
      cls: 'advancedNoteMover-rule-trigger-value',
    });
    valueInput.placeholder = getValuePlaceholder(trigger);
    valueInput.value = trigger.value;
    valueInput.setAttribute('aria-label', strings().modals.ruleEditorValue);
    valueInput.addEventListener('input', () => {
      trigger.value = valueInput.value;
      options.onDraftChange?.();
    });
    options.suggests.add(
      attachValueSuggester(
        options.app,
        valueInput,
        trigger,
        options.vaultIndexCache
      )
    );
  } else {
    row.addClass('advancedNoteMover-no-value-field');
  }

  const handleContainer = row.createDiv({
    cls: 'advancedNoteMover-drag-handle-container',
  });
  handleContainer.appendChild(DragDropManager.createDragHandle());
  return row;
}

function fillOperators(
  select: HTMLSelectElement,
  trigger: Trigger,
  onChange: () => void
): void {
  select.replaceChildren();
  for (const operator of getOperatorsForTrigger(trigger)) {
    const option = select.createEl('option', {
      value: operator,
      text: operator,
    });
    if (trigger.operator === operator) {
      option.selected = true;
    }
  }
  select.addEventListener('change', onChange);
}
