import { Setting, App, MarkdownRenderer, Component } from 'obsidian';
import { fill, strings } from '../i18n/locale';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';
import type { ChangelogEntry } from '../generated/changelog';
import { changelogBlocks } from '../domain/changelog/changelogBlocks';
import { renderChangelogBlock } from './changelogRender';

export class UpdateModal extends BaseModal {
  private currentVersion: string;
  private lastSeenVersion: string;
  private changelogEntries: ChangelogEntry[];
  private readonly renderComponent = new Component();

  constructor(
    app: App,
    parent: Component,
    currentVersion: string,
    lastSeenVersion: string,
    changelogEntries: ChangelogEntry[],
    options: BaseModalOptions = {}
  ) {
    super(app, {
      title: fill(strings().modals.updateTitle, { version: currentVersion }),
      titleIcon: 'party-popper',
      cssClass: 'advancedNoteMover-update-modal',
      size: 'medium',
      ...options,
    });
    parent.addChild(this.renderComponent);
    this.currentVersion = currentVersion;
    this.lastSeenVersion = lastSeenVersion;
    this.changelogEntries = changelogEntries;
  }

  protected createContent(): void {
    const { contentEl } = this;

    // Subtitle
    if (this.lastSeenVersion) {
      contentEl.createEl('p', {
        text: fill(strings().modals.updateWhatsNew, {
          version: this.lastSeenVersion,
        }),
        cls: 'advancedNoteMover-modal-subtitle',
      });
    } else {
      contentEl.createEl('p', {
        text: strings().modals.updateLatestChanges,
        cls: 'advancedNoteMover-modal-subtitle',
      });
    }

    // Changelog Content
    const isMobile = MobileUtils.isMobile();
    const changelogContainer = contentEl.createDiv({
      cls: isMobile
        ? 'advancedNoteMover-changelog-container advancedNoteMover-changelog-container-mobile'
        : 'advancedNoteMover-changelog-container',
    });

    if (this.changelogEntries.length === 0) {
      changelogContainer.createEl('p', {
        text: strings().modals.updateNoChangelog,
        cls: 'advancedNoteMover-no-changelog-text',
      });
    } else {
      this.renderChangelog(changelogContainer);
    }

    // Footer with links and button
    const footerContainer = contentEl.createDiv({
      cls: isMobile
        ? 'advancedNoteMover-modal-footer advancedNoteMover-modal-footer-mobile'
        : 'advancedNoteMover-modal-footer',
    });

    // GitHub Link
    const linkContainer = footerContainer.createDiv({
      cls: isMobile
        ? 'advancedNoteMover-update-modal-links advancedNoteMover-update-modal-links-mobile'
        : 'advancedNoteMover-update-modal-links',
    });
    const githubLink = linkContainer.createEl('a', {
      text: strings().modals.updateGithub,
      href: 'https://github.com/bueckerlars/obsidian-note-mover-shortcut/releases',
      cls: isMobile
        ? 'advancedNoteMover-update-modal-github-link advancedNoteMover-update-modal-github-link-mobile'
        : 'advancedNoteMover-update-modal-github-link',
    });
    githubLink.setAttribute('target', '_blank');

    // Close button
    if (isMobile) {
      new Setting(footerContainer).addButton(btn => {
        btn
          .setButtonText(strings().common.close)
          .setCta()
          .onClick(() => {
            this.close();
          });
      });
    } else {
      // Desktop: Original layout
      const buttonContainer = this.createButtonContainer(footerContainer);
      this.createButton(
        buttonContainer,
        strings().common.close,
        () => {
          this.close();
        },
        {
          isPrimary: true,
        }
      );
    }
  }

  private renderChangelog(container: HTMLElement): void {
    const copy = strings().modals;
    const isMobile = MobileUtils.isMobile();
    const blocks = changelogBlocks(this.changelogEntries, {
      version: version => fill(copy.updateVersion, { version }),
      sections: {
        breaking: copy.updateBreaking,
        features: copy.updateFeatures,
        improvements: copy.updateImprovements,
        bugFixes: copy.updateBugFixes,
        changes: copy.updateChanges,
        fixes: copy.updateFixes,
        performance: copy.updatePerformance,
      },
    });
    let parent = container;
    for (const block of blocks) {
      if (block.type === 'version') {
        parent = container.createDiv({
          cls: isMobile
            ? 'advancedNoteMover-changelog-version advancedNoteMover-changelog-version-mobile'
            : 'advancedNoteMover-changelog-version',
        });
      }
      renderChangelogBlock(parent, block, (item, markdown) => {
        void MarkdownRenderer.render(
          this.app,
          markdown,
          item,
          '',
          this.renderComponent
        );
      });
    }
  }

  onClose(): void {
    this.renderComponent.unload();
    super.onClose();
  }
}
