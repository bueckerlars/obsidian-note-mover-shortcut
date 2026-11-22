import { DropdownComponent, setIcon, type App } from 'obsidian';
import { fill, strings } from '../../../i18n/locale';
import { operatorLabel } from '../../../domain/rules/operatorLabel';
import type { ConditionIssue } from '../../../domain/rules/ruleValidation';
import type { PluginVaultIndexCache } from '../../../infrastructure/cache/plugin-vault-index-cache';
import { PropertySuggest } from '../../../settings/suggesters/PropertySuggest';
import type { SuggestRegistry } from '../../../settings/suggesters/suggestLifecycle';
import type { CriteriaType, Operator, Trigger } from '../../../types/RuleV2';
import { DragDropManager } from '../../../utils/DragDropManager';
import { operatorRequiresValue } from '../../../utils/OperatorMapping';
import {
  applyPropertyName,
  attachValueSuggester,
  criteriaIcon,
  criteriaLabel,
  getOperatorsForTrigger,
  getValuePlaceholder,
} from '../ruleEditorShared';
import { openConditionTypeMenu } from './ConditionTypeMenu';
import { createFieldError } from './fieldState';
import { createSelectButton } from './SelectButton';

export interface ConditionRowOptions {
  app: App;
  trigger: Trigger;
  /** False for a new condition that still shows "Choose…". */
  typeChosen: boolean;
  suggests: SuggestRegistry;
  vaultIndexCache?: PluginVaultIndexCache;
  onChooseType: (type: CriteriaType) => void;
  /** Operator, property or value changed. The row is not redrawn. */
  onDraftChange: () => void;
  onValueBlur: () => void;
  onRemove: () => void;
}

export interface ConditionRowHandle {
  el: HTMLElement;
  typeButton: HTMLButtonElement;
  /** Property name for a property, otherwise the value. */
  focusEntry: () => void;
  setIssue: (issue: ConditionIssue) => void;
}

function issueText(issue: ConditionIssue): string | null {
  if (!issue) return null;
  return issue.kind === 'valueEmpty'
    ? strings().modals.ruleEditorValueEmpty
    : fill(strings().modals.ruleEditorInvalidRegex, { message: issue.message });
}

function valueLabel(trigger: Trigger): string {
  if (trigger.criteriaType === 'tag') return criteriaLabel('tag');
  return trigger.criteriaType === 'properties'
    ? strings().modals.ruleEditorPropertyValue
    : strings().modals.ruleEditorValue;
}

/** One condition in the fixed grid: grip, type, (property), operator, value, remove. */
export function renderConditionRow(
  parent: HTMLElement,
  options: ConditionRowOptions
): ConditionRowHandle {
  const { trigger, typeChosen } = options;
  const isProperty = typeChosen && trigger.criteriaType === 'properties';
  const el = parent.createDiv({ cls: 'advancedNoteMover-condition' });
  const row = el.createDiv({ cls: 'advancedNoteMover-condition-row' });
  row.toggleClass('has-property', isProperty);
  row.appendChild(DragDropManager.createDragHandle());

  const typeButton = createSelectButton(row, {
    label: typeChosen
      ? criteriaLabel(trigger.criteriaType)
      : strings().modals.ruleEditorChoose,
    icon: typeChosen ? criteriaIcon(trigger.criteriaType) : null,
    ariaLabel: strings().modals.ruleEditorCriteriaType,
  });
  typeButton.addEventListener('click', () =>
    openConditionTypeMenu(typeButton, options.onChooseType)
  );

  let propertyInput: HTMLInputElement | null = null;
  if (isProperty) {
    propertyInput = row.createEl('input', {
      type: 'text',
      value: trigger.propertyName ?? '',
      placeholder: strings().modals.ruleEditorPropertyName,
      attr: { 'aria-label': strings().modals.ruleEditorPropertyName },
    });
    options.suggests.add(new PropertySuggest(options.app, propertyInput));
  }

  const operator = new DropdownComponent(row);
  operator.selectEl.addClass('advancedNoteMover-condition-operator');
  operator.selectEl.setAttribute(
    'aria-label',
    strings().modals.ruleEditorOperator
  );

  const valueInput = row.createEl('input', {
    type: 'text',
    value: trigger.value,
    placeholder: getValuePlaceholder(trigger),
    attr: { 'aria-label': valueLabel(trigger) },
  });

  const removeButton = row.createEl('button', {
    cls: 'clickable-icon advancedNoteMover-condition-remove',
    attr: {
      type: 'button',
      'aria-label': strings().modals.ruleEditorDeleteCondition,
    },
  });
  setIcon(removeButton, 'trash-2');
  removeButton.addEventListener('click', options.onRemove);

  const setError = createFieldError(valueInput, el);

  let valueSuggest: { destroy(): void } | null = null;
  options.suggests.add({ destroy: () => valueSuggest?.destroy() });
  const refreshValue = () => {
    const enabled = typeChosen && operatorRequiresValue(trigger.operator);
    valueInput.disabled = !enabled;
    valueSuggest?.destroy();
    valueSuggest = enabled
      ? attachValueSuggester(
          options.app,
          valueInput,
          trigger,
          options.vaultIndexCache
        )
      : null;
  };
  const refreshOperators = () => {
    operator.selectEl.replaceChildren();
    if (!typeChosen) {
      operator.addOption('', '—');
      operator.setDisabled(true);
      return;
    }
    const operators = getOperatorsForTrigger(trigger);
    for (const item of operators) operator.addOption(item, operatorLabel(item));
    if (!operators.includes(trigger.operator)) trigger.operator = operators[0];
    operator.setValue(trigger.operator);
  };
  refreshOperators();
  refreshValue();

  operator.onChange(value => {
    trigger.operator = value as Operator;
    refreshValue();
    options.onDraftChange();
  });
  propertyInput?.addEventListener('input', () => {
    const detected = applyPropertyName(
      options.app,
      trigger,
      propertyInput.value,
      options.vaultIndexCache
    );
    if (detected) {
      refreshOperators();
      refreshValue();
    }
    options.onDraftChange();
  });
  valueInput.addEventListener('input', () => {
    trigger.value = valueInput.value;
    options.onDraftChange();
  });
  valueInput.addEventListener('blur', options.onValueBlur);

  return {
    el,
    typeButton,
    focusEntry: () => (propertyInput ?? valueInput).focus(),
    setIssue: issue => setError(issueText(issue)),
  };
}
