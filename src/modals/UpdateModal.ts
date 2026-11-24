import { App } from 'obsidian';
import { fill, strings } from '../i18n/locale';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { renderModalFooter } from './modalFooter';
import { iconSpan } from './modalDom';
import type { ChangelogEntry } from '../generated/changelog';
import { releaseNotes, shortVersion } from '../domain/changelog/releaseNotes';

const CHANGELOG_URL =
  'https://github.com/bueckerlars/obsidian-note-mover-shortcut/releases';

export class UpdateModal extends BaseModal {
  constructor(
    app: App,
    currentVersion: string,
    private lastSeenVersion: string,
    private changelogEntries: ChangelogEntry[],
    options: BaseModalOptions = {}
  ) {
    super(app, {
      title: fill(strings().modals.updateTitle, {
        version: shortVersion(currentVersion),
      }),
      ...options,
    });
  }

  protected createContent(): void {
    const { contentEl } = this;
    const text = strings().modals;
    this.modalEl.addClass('advancedNoteMover-release-shell');

    if (this.lastSeenVersion) {
      contentEl.createEl('p', {
        cls: 'advancedNoteMover-modal-sub',
        text: fill(text.updateFrom, { version: this.lastSeenVersion }),
      });
    }

    const notes = releaseNotes(this.changelogEntries);
    const body = contentEl.createDiv({ cls: 'advancedNoteMover-release-body' });
    for (const highlight of notes.highlights) {
      const row = body.createDiv({ cls: 'advancedNoteMover-release-item' });
      iconSpan(row, highlight.icon, 'advancedNoteMover-release-icon');
      const copy = row.createDiv();
      copy.createDiv({
        cls: 'advancedNoteMover-strong',
        text: highlight.title,
      });
      copy.createDiv({
        cls: 'advancedNoteMover-release-text',
        text: highlight.text,
      });
    }
    if (notes.fixes.length > 0) {
      if (notes.highlights.length > 0) body.createEl('hr');
      body.createDiv({
        cls: 'advancedNoteMover-release-fixes-title',
        text: text.updateFixes,
      });
      const list = body.createEl('ul', {
        cls: 'advancedNoteMover-release-fixes',
      });
      for (const fix of notes.fixes) list.createEl('li', { text: fix });
    }
    if (notes.highlights.length === 0 && notes.fixes.length === 0) {
      body.createDiv({
        cls: 'advancedNoteMover-release-text',
        text: text.updateNoChangelog,
      });
    }

    const footer = renderModalFooter(contentEl, {
      primaryText: text.updateGotIt,
      onPrimary: () => {
        this.close();
      },
    });
    footer.leftEl.createEl('a', {
      cls: 'advancedNoteMover-link-button',
      text: text.updateFullChangelog,
      href: CHANGELOG_URL,
      attr: { target: '_blank', rel: 'noopener' },
    });
  }
}
