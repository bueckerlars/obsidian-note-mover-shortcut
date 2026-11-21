import type { App } from 'obsidian';
import { Setting } from 'obsidian';
import { strings } from '../../../i18n/locale';
import { FolderSuggest } from '../../../settings/suggesters/FolderSuggest';
import type { DestroyableSuggest } from '../../../settings/suggesters/suggestLifecycle';

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
): DestroyableSuggest {
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
  return new FolderSuggest(options.app, input);
}

export function renderDestinationSetting(
  container: HTMLElement,
  options: DestinationInputOptions
): { setting: Setting; destroy: () => void } {
  let suggest: DestroyableSuggest | null = null;
  const setting = new Setting(container)
    .setName(strings().modals.ruleEditorDestination)
    .addSearch(search => {
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
  return {
    setting,
    destroy: () => {
      suggest?.destroy();
    },
  };
}
