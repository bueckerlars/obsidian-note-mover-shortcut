import type AdvancedNoteMoverPlugin from 'main';
import { afterEach, describe, expect, it } from 'vitest';
import { seriousDomViolations } from '../domain/a11y/domRules';
import { PreviewModal } from '../modals/PreviewModal';
import { RulesSettingsSection } from '../settings/sections/RulesSettingsSection';

function installDom(): void {
  const proto = HTMLElement.prototype as unknown as {
    empty: () => void;
    addClass: (...names: string[]) => void;
    setAttr: (name: string, value: string) => void;
    createEl: (
      tag: string,
      options?: { cls?: string; text?: string; type?: string }
    ) => HTMLElement;
    createDiv: (options?: { cls?: string; text?: string }) => HTMLElement;
    createSpan: (options?: { cls?: string; text?: string }) => HTMLElement;
  };
  const create = function create(
    this: HTMLElement,
    tag: string,
    options?: { cls?: string; text?: string; type?: string }
  ) {
    const el = document.createElement(tag);
    if (options?.cls) el.className = options.cls;
    if (options?.text) el.textContent = options.text;
    if (options?.type && 'type' in el) {
      (el as HTMLInputElement).type = options.type;
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
  proto.createDiv = function createDiv(this: HTMLElement, options?) {
    return create.call(this, 'div', options);
  };
  proto.createSpan = function createSpan(this: HTMLElement, options?) {
    return create.call(this, 'span', options);
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
    if (options?.cls) el.className = options.cls;
    if (options?.text) el.textContent = options.text;
    if (options?.attr) {
      for (const [key, value] of Object.entries(options.attr)) {
        el.setAttribute(key, value);
      }
    }
    return el;
  };
}

describe('rendered controls', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('names buttons, avoids nested controls, and fills headings', () => {
    installDom();
    const plugin = {
      app: {},
      pluginData: {
        settings: {
          rulesV2: [
            {
              name: 'Inbox',
              destination: 'Projects',
              aggregation: 'all',
              active: true,
              triggers: [
                {
                  criteriaType: 'tag',
                  operator: 'includes item',
                  value: '#x',
                },
              ],
            },
          ],
        },
      },
      save_settings: async () => {},
      advancedNoteMover: { updateRuleManager: () => {} },
    } as unknown as AdvancedNoteMoverPlugin;
    const root = document.createElement('div');
    document.body.append(root);
    const section = new RulesSettingsSection(plugin, root, () => {});
    section.addRulesArray();

    const modal = new PreviewModal({} as never, {} as never, {
      successfulMoves: [
        {
          fileName: 'Note.md',
          currentPath: 'Note.md',
          targetPath: 'Archive/Note.md',
          willBeMoved: true,
          matchedRule: 'Inbox',
          tags: [],
        },
      ],
      analyzed: [
        {
          fileName: 'Note.md',
          currentPath: 'Note.md',
          targetPath: 'Archive/Note.md',
          willBeMoved: true,
          matchedRule: 'Inbox',
          tags: [],
        },
      ],
      totalFiles: 1,
      settings: { isFilterWhitelist: false },
    });
    modal.open();

    expect(seriousDomViolations(document.body)).toEqual([]);
  });
});
