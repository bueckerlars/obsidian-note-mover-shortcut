import type AdvancedNoteMoverPlugin from 'main';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RulesSettingsSection } from './sections/RulesSettingsSection';

function installDom(): void {
  const proto = HTMLElement.prototype as unknown as {
    empty: () => void;
    addClass: (...names: string[]) => void;
    createEl: (
      tag: string,
      options?: { cls?: string; text?: string }
    ) => HTMLElement;
    createDiv: (options?: { cls?: string; text?: string }) => HTMLElement;
  };
  proto.empty = function empty(this: HTMLElement) {
    this.replaceChildren();
  };
  proto.addClass = function addClass(this: HTMLElement, ...names: string[]) {
    this.classList.add(...names.filter(Boolean));
  };
  proto.createEl = function createEl(
    this: HTMLElement,
    tag: string,
    options?: { cls?: string; text?: string }
  ) {
    const el = document.createElement(tag);
    if (options?.cls) el.className = options.cls;
    if (options?.text) el.textContent = options.text;
    this.append(el);
    return el;
  };
  proto.createDiv = function createDiv(
    this: HTMLElement,
    options?: { cls?: string; text?: string }
  ) {
    return proto.createEl.call(this, 'div', options);
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

function rule(name: string) {
  return {
    name,
    destination: 'Projects',
    aggregation: 'all' as const,
    active: true,
    triggers: [
      {
        criteriaType: 'tag' as const,
        operator: 'includes item' as const,
        value: '#x',
      },
    ],
  };
}

function names(plugin: AdvancedNoteMoverPlugin): string[] {
  return (plugin.pluginData.settings.rulesV2 ?? []).map(item => item.name);
}

function menuItem(title: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll('.menu-item')).find(
    item => (item as HTMLElement).dataset.title === title
  ) as HTMLElement | undefined;
}

function openMenu(root: HTMLElement, index: number): void {
  document.querySelector('.menu')?.remove();
  const row = root.querySelectorAll(
    '.advancedNoteMover-rules-v2-container .setting-item'
  )[index];
  row
    ?.querySelector('[data-icon="more-horizontal"]')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function pressHandle(handle: Element, key: string, altKey: boolean): void {
  (handle as HTMLElement).focus();
  handle.dispatchEvent(
    new KeyboardEvent('keydown', { key, altKey, bubbles: true })
  );
}

describe('reorder rules', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('moves a rule up and down from the menu and persists the order', async () => {
    installDom();
    let saves = 0;
    const plugin = {
      app: {},
      pluginData: {
        settings: { rulesV2: [rule('A'), rule('B'), rule('C')] },
      },
      save_settings: async () => {
        saves += 1;
      },
      advancedNoteMover: { updateRuleManager: () => {} },
    } as unknown as AdvancedNoteMoverPlugin;
    const root = document.createElement('div');
    document.body.append(root);
    let section: RulesSettingsSection;
    section = new RulesSettingsSection(plugin, root, () => {
      root.replaceChildren();
      section.addRulesArray();
    });
    section.addRulesArray();

    openMenu(root, 0);
    expect(menuItem('Move up')?.getAttribute('aria-disabled')).toBe('true');
    expect(menuItem('Move down')?.getAttribute('aria-disabled')).toBeNull();
    menuItem('Move up')?.click();
    await Promise.resolve();
    expect(names(plugin)).toEqual(['A', 'B', 'C']);
    expect(saves).toBe(0);

    openMenu(root, 2);
    expect(menuItem('Move down')?.getAttribute('aria-disabled')).toBe('true');
    expect(menuItem('Move up')?.getAttribute('aria-disabled')).toBeNull();
    menuItem('Move down')?.click();
    await Promise.resolve();
    expect(names(plugin)).toEqual(['A', 'B', 'C']);
    expect(saves).toBe(0);

    openMenu(root, 1);
    menuItem('Move up')?.click();
    await vi.waitFor(() => {
      expect(names(plugin)).toEqual(['B', 'A', 'C']);
    });
    expect(saves).toBe(1);

    openMenu(root, 1);
    menuItem('Move down')?.click();
    await vi.waitFor(() => {
      expect(names(plugin)).toEqual(['B', 'C', 'A']);
    });
    expect(saves).toBe(2);
  });

  it('moves the focused handle with Alt+ArrowUp and Alt+ArrowDown', async () => {
    installDom();
    let saves = 0;
    const plugin = {
      app: {},
      pluginData: {
        settings: { rulesV2: [rule('A'), rule('B'), rule('C')] },
      },
      save_settings: async () => {
        saves += 1;
      },
      advancedNoteMover: { updateRuleManager: () => {} },
    } as unknown as AdvancedNoteMoverPlugin;
    const root = document.createElement('div');
    document.body.append(root);
    let section: RulesSettingsSection;
    section = new RulesSettingsSection(plugin, root, () => {
      root.replaceChildren();
      section.addRulesArray();
    });
    section.addRulesArray();

    const handles = () =>
      root.querySelectorAll('.advancedNoteMover-drag-handle');
    expect(handles()[0]?.getAttribute('role')).toBe('button');

    pressHandle(handles()[0], 'ArrowUp', true);
    await Promise.resolve();
    expect(names(plugin)).toEqual(['A', 'B', 'C']);
    expect(saves).toBe(0);

    pressHandle(handles()[1], 'ArrowDown', false);
    await Promise.resolve();
    expect(names(plugin)).toEqual(['A', 'B', 'C']);

    pressHandle(handles()[1], 'ArrowUp', true);
    await vi.waitFor(() => {
      expect(names(plugin)).toEqual(['B', 'A', 'C']);
    });
    expect(saves).toBe(1);

    pressHandle(handles()[1], 'ArrowDown', true);
    await vi.waitFor(() => {
      expect(names(plugin)).toEqual(['B', 'C', 'A']);
    });
    expect(saves).toBe(2);
  });
});
