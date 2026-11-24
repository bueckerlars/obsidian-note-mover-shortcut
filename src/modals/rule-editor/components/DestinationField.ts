import type { App } from 'obsidian';
import { Setting } from 'obsidian';
import { strings } from '../../../i18n/locale';
import { FolderSuggest } from '../../../settings/suggesters/FolderSuggest';
import type { DestroyableSuggest } from '../../../settings/suggesters/suggestLifecycle';

const TEMPLATE_EXAMPLE_KEYS = [
  'tag',
  'property',
  'dateComponent',
  'formattedDate',
  'fileCreated',
] as const;

/** Collapsed template examples. Chips insert a placeholder into the destination. */
export function renderDestinationHelp(
  parent: HTMLElement,
  onInsert: (template: string) => void
): void {
  const details = parent.createEl('details', {
    cls: 'advancedNoteMover-rule-mobile-help',
  });
  details.createEl('summary', {
    text: strings().modals.ruleEditorTemplateExamples,
  });
  const body = details.createDiv({
    cls: 'advancedNoteMover-rule-mobile-help-body',
  });
  const list = body.createEl('ul', {
    cls: 'advancedNoteMover-rule-mobile-help-list',
  });
  for (const key of TEMPLATE_EXAMPLE_KEYS) {
    const template = strings().ruleEditorExampleTemplates[key];
    const item = list.createEl('li');
    const chip = item.createEl('button', {
      text: template,
      cls: 'advancedNoteMover-rule-template-chip',
    });
    chip.setAttribute('type', 'button');
    chip.addEventListener('click', () => {
      onInsert(template);
    });
    item.createDiv({
      cls: 'advancedNoteMover-rule-mobile-description',
      text: strings().ruleEditorExamples[key],
    });
  }
  body.createDiv({
    cls: 'advancedNoteMover-rule-mobile-description',
    text: strings().modals.ruleEditorDestinationDescription,
  });
}

export interface DestinationInputOptions {
  app: App;
  value: string;
  placeholder: string;
  id?: string;
  className?: string;
  onChange: (value: string) => void;
}

/** Destination input plus folder suggestions. The caller owns the label. */
export function renderDestinationInput(
  parent: HTMLElement,
  options: DestinationInputOptions
): { suggest: DestroyableSuggest; input: HTMLInputElement } {
  const input = parent.createEl('input', { type: 'text' });
  input.placeholder = options.placeholder;
  input.value = options.value;
  input.setAttribute('aria-label', strings().modals.ruleEditorDestination);
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');
  input.spellcheck = false;
  if (options.id) {
    input.id = options.id;
  }
  if (options.className) {
    input.addClass(options.className);
  }
  input.addEventListener('input', () => {
    options.onChange(input.value);
  });
  return { suggest: new FolderSuggest(options.app, input), input };
}

export function renderDestinationSetting(
  container: HTMLElement,
  options: DestinationInputOptions
): { setting: Setting; input: HTMLInputElement; destroy: () => void } {
  let suggest: DestroyableSuggest | null = null;
  let input: HTMLInputElement | null = null;
  const setting = new Setting(container)
    .setName(strings().modals.ruleEditorDestination)
    .addSearch(search => {
      input = search.inputEl;
      suggest = new FolderSuggest(options.app, search.inputEl);
      search
        .setPlaceholder(options.placeholder)
        .setValue(options.value)
        .onChange(options.onChange);
      search.inputEl.setAttribute(
        'aria-label',
        strings().modals.ruleEditorDestination
      );
    });
  setting.settingEl.addClass('advancedNoteMover-rule-destination-setting');
  if (!input) {
    throw new Error('Destination field did not create an input');
  }
  return {
    setting,
    input,
    destroy: () => {
      suggest?.destroy();
    },
  };
}
