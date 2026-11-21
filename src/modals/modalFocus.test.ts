import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { BaseModal } from './BaseModal';

function installDom(): void {
  const nodeProto = Node.prototype as unknown as {
    instanceOf(this: Node, type: new () => unknown): boolean;
  };
  nodeProto.instanceOf = function instanceOf(type) {
    return this instanceof (type as new () => object);
  };

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

class SampleModal extends BaseModal {
  protected createContent(): void {
    this.contentEl.createEl('input', { type: 'text' });
    this.createButton(this.contentEl, 'Save', () => {}, { isPrimary: true });
  }
}

describe('modal focus', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('focuses the first field, closes on Escape, and returns focus', async () => {
    installDom();
    const opener = document.createElement('button');
    opener.textContent = 'Open';
    document.body.append(opener);
    opener.focus();

    const modal = new SampleModal({} as never, { title: 'Example' });
    modal.open();
    await new Promise(resolve => setTimeout(resolve, 30));

    const input = modal.contentEl.querySelector('input');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(document.activeElement).toBe(input);
    expect(
      modal.modalEl.classList.contains('advancedNoteMover-focus-scope')
    ).toBe(true);

    input?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(modal.contentEl.childElementCount).toBe(0);
    expect(document.activeElement).toBe(opener);
  });

  it('paints :focus-visible with the accent variable', () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), 'styles.css'),
      'utf8'
    );
    const rule = css.match(
      /\.advancedNoteMover-focus-scope :focus-visible \{[^}]+\}/
    );
    expect(rule?.[0]).toContain('var(--interactive-accent)');
    expect(rule?.[0]).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
