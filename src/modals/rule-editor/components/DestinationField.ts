import { setIcon, type App } from 'obsidian';
import { fill, strings } from '../../../i18n/locale';
import type { PlaceholderProblem } from '../../../domain/templates/placeholderValidation';
import { FolderSuggest } from '../../../settings/suggesters/FolderSuggest';
import { createFieldError } from './fieldState';
import {
  openPlaceholderMenu,
  type PlaceholderMenuOptions,
} from './PlaceholderMenu';

export interface DestinationFieldOptions {
  app: App;
  value: string;
  onChange: (value: string) => void;
  /** Menu content, read each time the menu opens. */
  getPlaceholders: () => Pick<PlaceholderMenuOptions, 'created' | 'properties'>;
  onHelp: () => void;
}

export interface DestinationState {
  /** Shown as red helper text under the field. */
  emptyError: boolean;
  problem: PlaceholderProblem | null;
  /** A real note and the folder it would go to. */
  resolved: { note: string; path: string } | null;
}

export interface DestinationFieldHandle {
  input: HTMLInputElement;
  /** Holds the field and its status. More rows can follow inside it. */
  cardEl: HTMLElement;
  update: (state: DestinationState) => void;
  destroy: () => void;
}

let nextCalloutId = 0;

/** Destination folder input, placeholder menu and the resolved path or error callout. */
export function renderDestinationField(
  parent: HTMLElement,
  options: DestinationFieldOptions
): DestinationFieldHandle {
  const text = strings().modals;
  parent.createDiv({
    cls: 'advancedNoteMover-section-title',
    text: text.ruleEditorMoveHeading,
  });
  const cardEl = parent.createDiv({
    cls: 'advancedNoteMover-card advancedNoteMover-destination-card',
  });
  const row = cardEl.createDiv({ cls: 'advancedNoteMover-destination-row' });
  const field = row.createDiv({ cls: 'advancedNoteMover-folder-field' });
  setIcon(
    field.createSpan({ cls: 'advancedNoteMover-folder-field-icon' }),
    'folder'
  );
  const input = field.createEl('input', {
    type: 'text',
    value: options.value,
    placeholder: text.ruleEditorDestinationPlaceholder,
    attr: {
      'aria-label': text.ruleEditorDestination,
      autocapitalize: 'off',
      autocorrect: 'off',
    },
  });
  input.spellcheck = false;
  const suggest = new FolderSuggest(options.app, input, { templates: false });

  const button = row.createEl('button', {
    cls: 'advancedNoteMover-icon-button',
    attr: {
      type: 'button',
      'aria-label': text.ruleEditorPlaceholderInsert,
      'aria-haspopup': 'menu',
    },
  });
  setIcon(button.createSpan(), 'braces');
  button.createSpan({
    cls: 'advancedNoteMover-phone-hidden',
    text: text.ruleEditorPlaceholderButton,
  });
  button.createSpan({
    cls: 'advancedNoteMover-phone-only',
    text: text.ruleEditorPlaceholderInsert,
  });

  // Inside the row so the phone layout can order it between field and button.
  const status = row.createDiv({
    cls: 'advancedNoteMover-destination-status',
  });
  const setEmptyError = createFieldError(input, status);

  const insert = (token: string, replaceBraces: boolean) => {
    const end = input.selectionEnd ?? input.value.length;
    const start = replaceBraces
      ? end - 2
      : (input.selectionStart ?? input.value.length);
    input.value = input.value.slice(0, start) + token + input.value.slice(end);
    const caret = start + token.length;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input'));
    input.focus();
  };
  const openMenu = (anchor: HTMLElement, replaceBraces: boolean) => {
    const rect = anchor.getBoundingClientRect();
    openPlaceholderMenu(
      { x: rect.left, y: rect.bottom + 4 },
      {
        ...options.getPlaceholders(),
        onPick: token => insert(token, replaceBraces),
        onHelp: options.onHelp,
        onClose: () => input.focus(),
      }
    );
  };
  button.addEventListener('click', () => openMenu(button, false));
  input.addEventListener('input', () => {
    options.onChange(input.value);
    const caret = input.selectionStart ?? 0;
    if (input.value.slice(caret - 2, caret) === '{{') openMenu(input, true);
  });

  const update = (state: DestinationState) => {
    status
      .findAll('.advancedNoteMover-callout, .advancedNoteMover-resolved')
      .forEach(el => el.remove());
    setEmptyError(state.emptyError ? text.ruleEditorDestinationEmpty : null);
    if (state.problem) {
      const id = `advancedNoteMover-callout-${++nextCalloutId}`;
      renderProblem(status, id, state.problem, {
        onUse: token => {
          input.value = input.value.replace(state.problem?.token ?? '', token);
          input.dispatchEvent(new Event('input'));
        },
        onSeeAll: () => openMenu(input, false),
      });
      input.addClass('advancedNoteMover-input-error');
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', id);
    } else if (state.resolved && !state.emptyError) {
      renderResolved(status, state.resolved);
    }
  };

  return {
    input,
    cardEl,
    update,
    destroy: () => suggest.destroy(),
  };
}

function renderProblem(
  parent: HTMLElement,
  id: string,
  problem: PlaceholderProblem,
  actions: { onUse: (token: string) => void; onSeeAll: () => void }
): void {
  const text = strings().modals;
  const callout = parent.createDiv({
    cls: 'advancedNoteMover-callout is-error',
    attr: { role: 'alert', id },
  });
  setIcon(
    callout.createSpan({ cls: 'advancedNoteMover-callout-icon' }),
    'alert-triangle'
  );
  const body = callout.createDiv({ cls: 'advancedNoteMover-callout-body' });
  const [before, after] = text.ruleEditorPlaceholderUnknown.split('{token}');
  const message = body.createDiv();
  message.appendText(before);
  message.createSpan({ cls: 'advancedNoteMover-token', text: problem.token });
  message.appendText(after);
  const links = body.createDiv({ cls: 'advancedNoteMover-callout-actions' });
  const link = (label: string, onClick: () => void) =>
    links
      .createEl('button', {
        cls: 'advancedNoteMover-link-button',
        text: label,
        attr: { type: 'button' },
      })
      .addEventListener('click', onClick);
  const { suggestion } = problem;
  if (suggestion) {
    link(fill(text.ruleEditorPlaceholderUse, { suggestion }), () =>
      actions.onUse(suggestion)
    );
  }
  link(text.ruleEditorPlaceholderSeeAll, actions.onSeeAll);
}

function renderResolved(
  parent: HTMLElement,
  resolved: { note: string; path: string }
): void {
  const row = parent.createDiv({ cls: 'advancedNoteMover-resolved' });
  setIcon(
    row.createSpan({ cls: 'advancedNoteMover-resolved-icon' }),
    'check-circle'
  );
  row.createSpan({
    text: fill(strings().modals.ruleEditorResolved, { note: resolved.note }),
  });
  const path = row.createSpan({ cls: 'advancedNoteMover-path' });
  setIcon(path.createSpan(), 'folder');
  path.createEl('b', { text: resolved.path });
}
