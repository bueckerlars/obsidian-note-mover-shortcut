import { describe, expect, it } from 'vitest';
import {
  CHANGELOG_SECTION_TYPES,
  type ChangelogBlock,
  type ChangelogSectionType,
} from '../domain/changelog/changelogBlocks';
import { renderChangelogBlock } from './changelogRender';

const SECTION_TITLES: Record<ChangelogSectionType, string> = {
  breaking: 'Breaking changes',
  features: 'New features',
  improvements: 'Improvements',
  bugFixes: 'Bug fixes',
  changes: 'Changes',
  fixes: 'Fixes',
  performance: 'Performance',
};

function installDom(): void {
  const proto = HTMLElement.prototype as unknown as {
    addClass: (...names: string[]) => void;
    createEl: (
      tag: string,
      options?: { cls?: string; text?: string }
    ) => HTMLElement;
    createDiv: (options?: { cls?: string; text?: string }) => HTMLElement;
    createSpan: (options?: { cls?: string; text?: string }) => HTMLElement;
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
  proto.addClass = function addClass(this: HTMLElement, ...names: string[]) {
    this.classList.add(...names.filter(Boolean));
  };
  proto.createEl = create;
  proto.createDiv = function createDiv(this: HTMLElement, options?) {
    return create.call(this, 'div', options);
  };
  proto.createSpan = function createSpan(this: HTMLElement, options?) {
    return create.call(this, 'span', options);
  };
}

function visibleText(block: ChangelogBlock): string {
  installDom();
  const root = document.createElement('div');
  renderChangelogBlock(root, block, (item, markdown) => {
    item.textContent = markdown;
  });
  return root.textContent ?? '';
}

describe('renderChangelogBlock', () => {
  it('shows the version', () => {
    expect(visibleText({ type: 'version', title: 'Version 1.2.0' })).toContain(
      'Version 1.2.0'
    );
  });

  it.each(CHANGELOG_SECTION_TYPES)('shows %s', type => {
    const title = SECTION_TITLES[type];
    const item = `Visible ${title} item`;
    const text = visibleText({ type, title, items: [item] });
    expect(text).toContain(title);
    expect(text).toContain(item);
  });
});
