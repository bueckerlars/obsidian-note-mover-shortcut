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

export class Setting {
  settingEl: HTMLElement = document.createElement('div');

  constructor(containerEl: HTMLElement) {
    containerEl.append(this.settingEl);
  }

  addButton(
    cb: (button: {
      setButtonText: (text: string) => unknown;
      setTooltip: (text: string) => unknown;
      onClick: (fn: () => void) => unknown;
    }) => void
  ): this {
    const button = document.createElement('button');
    const api = {
      setButtonText(text: string) {
        button.textContent = text;
        return api;
      },
      setTooltip() {
        return api;
      },
      onClick(fn: () => void) {
        button.addEventListener('click', () => {
          fn();
        });
        return api;
      },
    };
    this.settingEl.append(button);
    cb(api);
    return this;
  }
}

export class Notice {
  messageEl: HTMLElement = document.createElement('div');
  hide(): void {}
}

export const Platform = {
  isMobile: false,
  isDesktop: true,
  isIosApp: false,
  isAndroidApp: false,
  isPhone: false,
  isTablet: false,
};

export function setIcon(): void {}
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
