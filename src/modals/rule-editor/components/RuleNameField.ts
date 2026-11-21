import { strings } from '../../../i18n/locale';

export interface RuleNameFieldOptions {
  value: string;
  id?: string;
  className?: string;
  onChange: (value: string) => void;
}

/** Name input. The caller owns the surrounding row. */
export function renderRuleNameField(
  parent: HTMLElement,
  options: RuleNameFieldOptions
): HTMLInputElement {
  const input = parent.createEl('input', { type: 'text' });
  input.placeholder = strings().modals.ruleEditorNamePlaceholder;
  input.value = options.value;
  input.setAttribute('aria-label', strings().modals.ruleEditorName);
  if (options.id) {
    input.id = options.id;
  }
  if (options.className) {
    input.addClass(options.className);
  }
  input.addEventListener('input', () => {
    options.onChange(input.value);
  });
  return input;
}
