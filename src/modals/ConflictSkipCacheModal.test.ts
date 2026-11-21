import { collectFailures } from '../../scripts/ui-smoke.mjs';
import { ConflictSkipCacheModal } from './ConflictSkipCacheModal';

function installDomHelpers(): void {
  const proto = HTMLElement.prototype as unknown as {
    empty: () => void;
    addClass: (...names: string[]) => void;
    setAttr: (name: string, value: string) => void;
    createEl: (
      this: HTMLElement,
      tag: string,
      options?: { cls?: string; text?: string }
    ) => HTMLElement;
    createDiv: (options?: { cls?: string; text?: string }) => HTMLElement;
    createSpan: (options?: { cls?: string; text?: string }) => HTMLElement;
  };
  proto.empty = function empty(this: HTMLElement) {
    this.replaceChildren();
  };
  proto.addClass = function addClass(this: HTMLElement, ...names: string[]) {
    this.classList.add(...names);
  };
  proto.setAttr = function setAttr(
    this: HTMLElement,
    name: string,
    value: string
  ) {
    this.setAttribute(name, value);
  };
  const create = function create(
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

describe('ConflictSkipCacheModal title', () => {
  it('keeps the title after dismiss refreshes the content', async () => {
    installDomHelpers();
    const entries = [
      {
        sourcePath: 'Note.md',
        targetPath: 'Archive/Note.md',
        skippedAt: Date.now(),
      },
    ];
    const plugin = {
      conflictSkipCacheManager: {
        getEntries: () => entries.slice(),
        removeEntry: async () => {
          entries.length = 0;
        },
      },
    };
    const modal = new ConflictSkipCacheModal({} as never, plugin as never);
    modal.open();

    const dismiss = Array.from(document.querySelectorAll('button')).find(
      button => button.textContent === 'Dismiss'
    );
    dismiss?.click();
    await Promise.resolve();

    const title = document.querySelector('.modal .modal-title');
    expect(title?.textContent).toBe('Skipped move conflicts');
    expect(
      collectFailures(document).some(
        (failure: { check: string }) => failure.check === 'modalTitle'
      )
    ).toBe(false);
    document.body.innerHTML = '';
  });
});
