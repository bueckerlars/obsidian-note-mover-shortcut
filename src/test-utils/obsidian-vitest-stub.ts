/**
 * Minimal stub so Vitest can load modules that import `obsidian`.
 * Not used at runtime in Obsidian.
 */
export class TAbstractFile {}
export class TFile extends TAbstractFile {
  extension = 'md';
  path = '';
  name = '';
}

export class TFolder extends TAbstractFile {}
export class AbstractInputSuggest<T> {
  protected suggestions: T[] = [];
  app: unknown;

  constructor(app?: unknown) {
    this.app = app;
  }
}

export function getLanguage(): string {
  return 'en';
}

export function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.' && part !== '') {
      parts.push(part);
    }
  }
  return parts.join('/');
}

export function getAllTags(cache: Record<string, unknown>): string[] {
  const tags = cache.tags as { tag: string }[] | undefined;
  if (!tags?.length) return [];
  return tags.map(t => t.tag);
}

export function getFrontMatterInfo(content: string) {
  if (!content.startsWith('---\n')) {
    return {
      exists: false,
      frontmatter: '',
      from: 0,
      to: 0,
      contentStart: 0,
    };
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    return {
      exists: false,
      frontmatter: '',
      from: 0,
      to: 0,
      contentStart: 0,
    };
  }
  return {
    exists: true,
    frontmatter: content.slice(4, end),
    from: 4,
    to: end,
    contentStart: end + 4,
  };
}

export function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^tags:\s*\[(.*)\]\s*$/);
    if (m) {
      result.tags = m[1]
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  return result;
}

export class Modal {
  modalEl: HTMLElement = document.createElement('div');
  contentEl: HTMLElement = document.createElement('div');
  titleEl: HTMLElement = document.createElement('div');
  containerEl: HTMLElement = document.createElement('div');

  constructor(public app: unknown) {
    this.modalEl.className = 'modal';
    this.titleEl.className = 'modal-title';
    this.contentEl.className = 'modal-content';
    this.modalEl.append(this.titleEl, this.contentEl);
    document.body.append(this.modalEl);
  }

  setTitle(title: string): void {
    this.titleEl.textContent = title;
  }

  open(): void {
    this.onOpen();
  }

  onOpen(): void {}

  close(): void {
    this.onClose();
  }

  onClose(): void {}
}

export class PluginSettingTab {
  containerEl: HTMLElement = document.createElement('div');

  constructor(
    public app: unknown,
    public plugin: unknown
  ) {}

  hide(): void {}

  display(): void {}
}

export class Setting {
  settingEl: HTMLElement = document.createElement('div');
  infoEl: HTMLElement = document.createElement('div');
  nameEl: HTMLElement = document.createElement('div');
  descEl: HTMLElement = document.createElement('div');
  controlEl: HTMLElement = document.createElement('div');

  constructor(containerEl: HTMLElement) {
    this.settingEl.className = 'setting-item';
    this.infoEl.className = 'setting-item-info';
    this.nameEl.className = 'setting-item-name';
    this.descEl.className = 'setting-item-description';
    this.controlEl.className = 'setting-item-control';
    this.infoEl.append(this.nameEl, this.descEl);
    this.settingEl.append(this.infoEl, this.controlEl);
    containerEl.append(this.settingEl);
  }

  setName(name: string): this {
    this.nameEl.textContent = name;
    return this;
  }

  setDesc(desc: string | DocumentFragment): this {
    this.descEl.replaceChildren();
    if (typeof desc === 'string') {
      this.descEl.textContent = desc;
    } else {
      this.descEl.append(desc);
    }
    return this;
  }

  setHeading(): this {
    this.settingEl.classList.add('setting-item-heading');
    return this;
  }

  setClass(cls: string): this {
    this.settingEl.classList.add(...cls.split(/\s+/).filter(Boolean));
    return this;
  }

  setTooltip(text: string): this {
    this.settingEl.setAttribute('title', text);
    return this;
  }

  addToggle(
    cb: (toggle: {
      setValue: (value: boolean) => unknown;
      onChange: (fn: (value: boolean) => void) => unknown;
      setTooltip: (text: string) => unknown;
    }) => void
  ): this {
    this.settingEl.classList.add('mod-toggle');
    const box = document.createElement('div');
    box.className = 'checkbox-container';
    const api = {
      setValue() {
        return api;
      },
      onChange() {
        return api;
      },
      setTooltip(text: string) {
        box.setAttribute('aria-label', text);
        return api;
      },
    };
    this.controlEl.append(box);
    cb(api);
    return this;
  }

  addText(
    cb: (text: {
      setPlaceholder: (value: string) => unknown;
      setValue: (value: string) => unknown;
      onChange: (fn: (value: string) => void) => unknown;
      inputEl: HTMLInputElement;
    }) => void
  ): this {
    const input = document.createElement('input');
    input.type = 'text';
    const api = {
      setPlaceholder(value: string) {
        input.placeholder = value;
        return api;
      },
      setValue(value: string) {
        input.value = value;
        return api;
      },
      onChange() {
        return api;
      },
      inputEl: input,
    };
    this.controlEl.append(input);
    cb(api);
    return this;
  }

  addSearch(
    cb: (search: {
      setPlaceholder: (value: string) => unknown;
      setValue: (value: string) => unknown;
      onChange: (fn: (value: string) => void) => unknown;
      inputEl: HTMLInputElement;
    }) => void
  ): this {
    const input = document.createElement('input');
    input.type = 'search';
    const api = {
      setPlaceholder(value: string) {
        input.placeholder = value;
        return api;
      },
      setValue(value: string) {
        input.value = value;
        return api;
      },
      onChange() {
        return api;
      },
      inputEl: input,
    };
    this.controlEl.append(input);
    cb(api);
    return this;
  }

  addDropdown(
    cb: (dropdown: {
      addOption: (value: string, label: string) => unknown;
      setValue: (value: string) => unknown;
      onChange: (fn: (value: string) => void) => unknown;
    }) => void
  ): this {
    const select = document.createElement('select');
    const api = {
      addOption(value: string, label: string) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.append(option);
        return api;
      },
      setValue(value: string) {
        select.value = value;
        return api;
      },
      onChange() {
        return api;
      },
    };
    this.controlEl.append(select);
    cb(api);
    return this;
  }

  addButton(
    cb: (button: {
      setButtonText: (text: string) => unknown;
      setTooltip: (text: string) => unknown;
      setCta: () => unknown;
      setWarning: () => unknown;
      setIcon: (icon: string) => unknown;
      setDisabled: (disabled: boolean) => unknown;
      onClick: (fn: () => void) => unknown;
      buttonEl: HTMLButtonElement;
    }) => void
  ): this {
    const button = document.createElement('button');
    const api = {
      setButtonText(text: string) {
        button.textContent = text;
        return api;
      },
      setTooltip(text: string) {
        button.setAttribute('aria-label', text);
        return api;
      },
      setCta() {
        button.classList.add('mod-cta');
        return api;
      },
      setWarning() {
        button.classList.add('mod-warning');
        return api;
      },
      setIcon(icon: string) {
        button.dataset.icon = icon;
        const svg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg'
        );
        button.append(svg);
        return api;
      },
      setDisabled(disabled: boolean) {
        button.disabled = disabled;
        return api;
      },
      onClick(fn: () => void) {
        button.addEventListener('click', () => {
          fn();
        });
        return api;
      },
      buttonEl: button,
    };
    this.controlEl.append(button);
    cb(api);
    return this;
  }

  addExtraButton(
    cb: (button: {
      setIcon: (icon: string) => unknown;
      setTooltip: (text: string) => unknown;
      onClick: (fn: (event: MouseEvent) => void) => unknown;
      extraSettingsEl: HTMLElement;
    }) => void
  ): this {
    const button = document.createElement('div');
    button.className = 'clickable-icon';
    const api = {
      setIcon(icon: string) {
        button.dataset.icon = icon;
        return api;
      },
      setTooltip(text: string) {
        button.setAttribute('aria-label', text);
        return api;
      },
      onClick(fn: (event: MouseEvent) => void) {
        button.addEventListener('click', event => {
          fn(event);
        });
        return api;
      },
      extraSettingsEl: button,
    };
    this.controlEl.append(button);
    cb(api);
    return this;
  }
}

export class Notice {
  messageEl: HTMLElement = document.createElement('div');
  hide(): void {}
}

export class Menu {
  private items: HTMLElement[] = [];

  addItem(cb: (item: MenuItemStub) => void): this {
    const el = document.createElement('div');
    el.className = 'menu-item';
    const api: MenuItemStub = {
      dom: el,
      setWarning() {
        el.classList.add('is-warning');
        return api;
      },
      setTitle(text: string) {
        el.dataset.title = text;
        el.append(document.createTextNode(text));
        return api;
      },
      setIcon(icon: string) {
        el.dataset.icon = icon;
        return api;
      },
      setDisabled(disabled: boolean) {
        if (disabled) {
          el.setAttribute('aria-disabled', 'true');
        } else {
          el.removeAttribute('aria-disabled');
        }
        return api;
      },
      onClick(fn: () => void) {
        el.addEventListener('click', () => {
          if (el.getAttribute('aria-disabled') === 'true') return;
          fn();
        });
        return api;
      },
    };
    cb(api);
    this.items.push(el);
    return this;
  }

  addSeparator(): this {
    return this;
  }

  showAtPosition(): this {
    const menu = document.createElement('div');
    menu.className = 'menu';
    for (const item of this.items) {
      menu.append(item);
    }
    document.body.append(menu);
    return this;
  }
}

interface MenuItemStub {
  dom: HTMLElement;
  setWarning: (warning: boolean) => MenuItemStub;
  setTitle: (text: string) => MenuItemStub;
  setIcon: (icon: string) => MenuItemStub;
  setDisabled: (disabled: boolean) => MenuItemStub;
  onClick: (fn: () => void) => MenuItemStub;
}

export const Platform = {
  isMobile: false,
  isDesktop: true,
  isIosApp: false,
  isAndroidApp: false,
  isPhone: false,
  isTablet: false,
};

export function setIcon(el?: HTMLElement, icon?: string): void {
  if (el && icon) el.dataset.icon = icon;
}
export function setTooltip(): void {}

export class Component {
  unload(): void {}
}

export const MarkdownRenderer = {
  render: async (): Promise<void> => {},
};

export function parseFrontMatterTags(frontmatter: Record<string, unknown>) {
  const raw = frontmatter.tags;
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.map(t => (String(t).startsWith('#') ? String(t) : `#${t}`));
  }
  return null;
}
