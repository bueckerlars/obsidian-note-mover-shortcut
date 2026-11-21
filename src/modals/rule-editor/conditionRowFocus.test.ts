import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RuleV2 } from '../../types/RuleV2';
import { RuleEditorModal } from '../RuleEditorModal';

function installEditorDom(): void {
  const proto = HTMLElement.prototype as unknown as {
    empty: () => void;
    addClass: (...names: string[]) => void;
    setAttr: (name: string, value: string) => void;
    createEl: (
      tag: string,
      options?: {
        cls?: string;
        text?: string;
        type?: string;
        value?: string;
        placeholder?: string;
        attr?: Record<string, string>;
      }
    ) => HTMLElement;
    createDiv: (options?: { cls?: string; text?: string }) => HTMLElement;
  };
  const create = function create(
    this: HTMLElement,
    tag: string,
    options?: {
      cls?: string;
      text?: string;
      type?: string;
      value?: string;
      placeholder?: string;
      attr?: Record<string, string>;
    }
  ) {
    const el = document.createElement(tag);
    if (options?.cls) {
      el.className = options.cls;
    }
    if (options?.text) {
      el.textContent = options.text;
    }
    if (options?.type && 'type' in el) {
      (el as HTMLInputElement).type = options.type;
    }
    if (options?.placeholder && 'placeholder' in el) {
      (el as HTMLInputElement).placeholder = options.placeholder;
    }
    if (options?.value !== undefined && 'value' in el) {
      (el as HTMLInputElement).value = options.value;
    }
    if (options?.attr) {
      for (const [key, value] of Object.entries(options.attr)) {
        el.setAttribute(key, value);
      }
    }
    this.append(el);
    return el;
  };
  proto.empty = function empty(this: HTMLElement) {
    this.replaceChildren();
  };
  proto.addClass = function addClass(this: HTMLElement, ...names: string[]) {
    this.classList.add(...names.filter(Boolean));
  };
  proto.setAttr = function setAttr(
    this: HTMLElement,
    name: string,
    value: string
  ) {
    this.setAttribute(name, value);
  };
  proto.createEl = create;
  proto.createDiv = function createDiv(
    this: HTMLElement,
    options?: { cls?: string; text?: string }
  ) {
    return create.call(this, 'div', options);
  };

  const globals = globalThis as unknown as {
    createDiv: (options?: {
      cls?: string;
      text?: string;
      attr?: Record<string, string>;
    }) => HTMLDivElement;
  };
  globals.createDiv = options => {
    const el = document.createElement('div');
    if (options?.cls) {
      el.className = options.cls;
    }
    if (options?.text) {
      el.textContent = options.text;
    }
    if (options?.attr) {
      for (const [key, value] of Object.entries(options.attr)) {
        el.setAttribute(key, value);
      }
    }
    return el;
  };
}

function rule(): RuleV2 {
  return {
    id: 'rule-1',
    name: 'Inbox',
    active: true,
    aggregation: 'all',
    destination: 'Inbox',
    triggers: [
      {
        criteriaType: 'tag',
        operator: 'includes item',
        value: '',
      },
    ],
  } as RuleV2;
}

describe('rule editor value field', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('keeps focus in the value field while typing', () => {
    installEditorDom();
    const app = {
      vault: { getMarkdownFiles: () => [] },
      metadataCache: { getFileCache: () => null },
    };
    const modal = new RuleEditorModal(app as never, {
      rule: rule(),
      isEditMode: false,
      onSave: async () => {},
    });
    modal.open();

    const input = document.querySelector(
      '.advancedNoteMover-rule-trigger-value'
    );
    expect(input).toBeInstanceOf(HTMLInputElement);
    const valueInput = input as HTMLInputElement;
    valueInput.focus();

    const renderTriggers = vi.spyOn(
      RuleEditorModal.prototype as unknown as {
        renderTriggers: () => void;
      },
      'renderTriggers'
    );

    const typed = 'abcdefghij';
    for (const character of typed) {
      valueInput.value += character;
      valueInput.dispatchEvent(new Event('input'));
    }

    expect(document.activeElement).toBe(valueInput);
    expect(valueInput.value).toBe(typed);
    expect(renderTriggers).not.toHaveBeenCalled();
    renderTriggers.mockRestore();
    modal.onClose();
  });
});
