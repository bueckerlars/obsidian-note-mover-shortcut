import { setIcon } from 'obsidian';
import {
  type ChangelogBlock,
  type ChangelogSectionType,
} from '../domain/changelog/changelogBlocks';

const SECTION_ICONS: Record<ChangelogSectionType, string> = {
  breaking: 'alert-triangle',
  features: 'sparkles',
  improvements: 'zap',
  bugFixes: 'bug',
  changes: 'refresh-cw',
  fixes: 'wrench',
  performance: 'zap',
};

export function renderChangelogBlock(
  parent: HTMLElement,
  block: ChangelogBlock,
  writeItem: (item: HTMLElement, markdown: string) => void
): void {
  if (block.type === 'version') {
    parent.createEl('h3', {
      text: block.title,
      cls: 'advancedNoteMover-changelog-version-title',
    });
    return;
  }

  const section = parent.createDiv({
    cls:
      block.type === 'breaking'
        ? 'advancedNoteMover-changelog-section advancedNoteMover-changelog-section-breaking'
        : 'advancedNoteMover-changelog-section',
  });
  const heading = section.createEl('h4', {
    cls: 'advancedNoteMover-changelog-section-title',
  });
  const iconEl = heading.createSpan({ cls: 'advancedNoteMover-icon' });
  iconEl.ariaHidden = 'true';
  setIcon(iconEl, SECTION_ICONS[block.type]);
  heading.createSpan({ text: block.title });
  const list = section.createEl('ul', {
    cls: 'advancedNoteMover-changelog-list',
  });
  for (const markdown of block.items) {
    const item = list.createEl('li');
    writeItem(item, markdown);
  }
}
