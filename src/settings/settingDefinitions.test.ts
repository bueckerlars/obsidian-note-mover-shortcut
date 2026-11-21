import type AdvancedNoteMoverPlugin from 'main';
import { AdvancedNoteMoverSettingsTab } from './Settings';
import {
  SETTING_DEFINITIONS,
  catalogText,
  settingDefinition,
} from './settingDefinitions';

function installObsidianDom(): void {
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
    if (options?.cls) {
      el.className = options.cls;
    }
    if (options?.text) {
      el.textContent = options.text;
    }
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
    createEl: (
      tag: string,
      options?: { cls?: string; text?: string }
    ) => HTMLElement;
    createDiv: (options?: {
      cls?: string;
      text?: string;
      attr?: Record<string, string>;
    }) => HTMLDivElement;
    createFragment: (cb?: (frag: DocumentFragment) => void) => DocumentFragment;
  };
  globals.createEl = (tag, options) => {
    const el = document.createElement(tag);
    if (options?.cls) {
      el.className = options.cls;
    }
    if (options?.text) {
      el.textContent = options.text;
    }
    return el;
  };
  globals.createDiv = options => {
    const el = document.createElement('div');
    if (typeof options === 'object' && options) {
      if (options.cls) {
        el.className = options.cls;
      }
      if (options.text) {
        el.textContent = options.text;
      }
      if (options.attr) {
        for (const [key, value] of Object.entries(options.attr)) {
          el.setAttribute(key, String(value));
        }
      }
    }
    return el;
  };
  globals.createFragment = cb => {
    const fragment = document.createDocumentFragment();
    cb?.(fragment);
    return fragment;
  };
}

function revealedPlugin(): AdvancedNoteMoverPlugin {
  return {
    app: {},
    pluginData: {
      settings: {
        triggers: {
          enableOnEditTrigger: false,
          enablePeriodicMovement: true,
          periodicMovementInterval: 5,
        },
        filters: { filter: [] },
        rulesV2: [],
        createMissingDestinationFolders: true,
        attachments: {
          moveWithNote: true,
          skipSharedAttachments: true,
          deleteEmptyAssetFolders: false,
        },
        conflictResolution: { strategy: 'skip' },
        retentionPolicy: { value: 30, unit: 'days' },
        enableRuleEvaluationCache: true,
        enableVaultIndexCache: true,
        enablePerformanceDebug: false,
        showReleaseNotesOnUpdate: true,
      },
    },
  } as unknown as AdvancedNoteMoverPlugin;
}

function controlMatches(setting: HTMLElement, id: string): boolean {
  const kind = settingDefinition(id).control;
  const hasButton = setting.querySelector('button') !== null;
  const hasSelect = setting.querySelector('select') !== null;
  const hasText = setting.querySelector('input[type="text"]') !== null;
  const hasToggle = setting.querySelector('.checkbox-container') !== null;
  if (kind === 'heading') {
    return (
      setting.classList.contains('setting-item-heading') &&
      !hasButton &&
      !hasSelect &&
      !hasText &&
      !hasToggle
    );
  }
  if (kind === 'info') {
    return !hasButton && !hasSelect && !hasText && !hasToggle;
  }
  if (kind === 'toggle') {
    return hasToggle;
  }
  if (kind === 'text') {
    return hasText;
  }
  if (kind === 'dropdown') {
    return hasSelect;
  }
  return hasButton;
}

describe('setting definitions', () => {
  it('gives every setting a unique id', () => {
    const ids = SETTING_DEFINITIONS.map(definition => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders each definition in its own section once', () => {
    installObsidianDom();
    const tab = new AdvancedNoteMoverSettingsTab(revealedPlugin());
    tab.display();
    const root = tab.containerEl;

    const rendered = Array.from(
      root.querySelectorAll<HTMLElement>('[data-setting-id]')
    );
    expect(rendered.map(el => el.dataset.settingId).sort()).toEqual(
      SETTING_DEFINITIONS.map(definition => definition.id).sort()
    );

    for (const definition of SETTING_DEFINITIONS) {
      const matches = rendered.filter(
        el => el.dataset.settingId === definition.id
      );
      expect(matches).toHaveLength(1);
      expect(matches[0]?.dataset.sectionId).toBe(definition.sectionId);
      expect(matches[0]?.querySelector('.setting-item-name')?.textContent).toBe(
        catalogText(definition.nameKey)
      );
      expect(controlMatches(matches[0]!, definition.id)).toBe(true);
      if (
        definition.control === 'toggle' ||
        definition.control === 'dropdown'
      ) {
        expect(
          matches[0]?.classList.contains('advancedNoteMover-setting-stack')
        ).toBe(false);
      }
    }

    expect(
      root
        .querySelector('[data-setting-id="triggers.interval"]')
        ?.classList.contains('advancedNoteMover-setting-stack')
    ).toBe(true);
    expect(
      root
        .querySelector('[data-setting-id="history.retention"]')
        ?.classList.contains('advancedNoteMover-setting-stack')
    ).toBe(true);

    const outsideLists = Array.from(
      root.querySelectorAll('.setting-item')
    ).filter(
      el =>
        !el.closest(
          '.advancedNoteMover-rules-v2-container, .advancedNoteMover-filters-container'
        )
    );
    expect(outsideLists.every(el => el.hasAttribute('data-setting-id'))).toBe(
      true
    );
  });
});
