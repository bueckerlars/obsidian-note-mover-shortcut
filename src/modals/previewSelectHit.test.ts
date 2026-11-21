import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PreviewModal } from './PreviewModal';

function installPreviewDom(): void {
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
    if (options?.cls) {
      el.className = options.cls;
    }
    if (options?.text) {
      el.textContent = options.text;
    }
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
  proto.createDiv = function createDiv(
    this: HTMLElement,
    options?: { cls?: string; text?: string }
  ) {
    return create.call(this, 'div', options);
  };
  proto.createSpan = function createSpan(
    this: HTMLElement,
    options?: { cls?: string; text?: string }
  ) {
    return create.call(this, 'span', options);
  };
}

function loadPluginStyles(): void {
  const css = fs.readFileSync(
    path.resolve(process.cwd(), 'styles.css'),
    'utf8'
  );
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
}

function pixels(value: string): number {
  return Number.parseFloat(value);
}

describe('preview checkbox hit target', () => {
  afterEach(() => {
    document.body.classList.remove('is-mobile');
    document.body.replaceChildren();
    document.head.querySelectorAll('style').forEach(style => style.remove());
  });

  it('sizes the mobile preview checkbox to at least 44px', () => {
    installPreviewDom();
    loadPluginStyles();
    document.body.classList.add('is-mobile');
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

    const checkbox = document.querySelector(
      '.advancedNoteMover-preview-select input[type="checkbox"]'
    );
    expect(checkbox).toBeInstanceOf(HTMLInputElement);
    const style = getComputedStyle(checkbox as HTMLInputElement);
    expect(pixels(style.width)).toBeGreaterThanOrEqual(44);
    expect(pixels(style.height)).toBeGreaterThanOrEqual(44);
  });
});
