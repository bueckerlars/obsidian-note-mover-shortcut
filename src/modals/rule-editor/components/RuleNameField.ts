import { Setting } from 'obsidian';
import { strings } from '../../../i18n/locale';
import { createFieldError } from './fieldState';

export interface RuleNameFieldHandle {
  input: HTMLInputElement;
  /** Null clears the error. */
  setError: (message: string | null) => void;
}

/** Name row. Enter in the field calls `onEnter`. */
export function renderRuleNameField(
  parent: HTMLElement,
  options: {
    value: string;
    onChange: (value: string) => void;
    onEnter: () => void;
  }
): RuleNameFieldHandle {
  let input!: HTMLInputElement;
  const setting = new Setting(parent)
    .setName(strings().modals.ruleEditorName)
    .setClass('advancedNoteMover-name-setting')
    .addText(text => {
      input = text.inputEl;
      text
        .setPlaceholder(strings().modals.ruleEditorNamePlaceholder)
        .setValue(options.value)
        .onChange(options.onChange);
    });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      options.onEnter();
    }
  });
  return { input, setError: createFieldError(input, setting.controlEl) };
}
