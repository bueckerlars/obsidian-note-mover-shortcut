import {
  Setting,
  App,
  ButtonComponent,
  MarkdownRenderer,
  Component,
} from 'obsidian';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';

interface ChangelogEntry {
  version: string;
  changes: {
    features?: string[];
    bugFixes?: string[];
    improvements?: string[];
    changes?: string[];
    fixes?: string[];
    performance?: string[];
  };
}

export class UpdateModal extends BaseModal {
  private currentVersion: string;
  private lastSeenVersion: string;
  private changelogEntries: ChangelogEntry[];

  constructor(
    app: App,
    currentVersion: string,
    lastSeenVersion: string,
    changelogEntries: ChangelogEntry[],
    options: BaseModalOptions = {}
  ) {
    super(app, {
      title: `Advanced Note Mover updated to version ${currentVersion}!`,
      titleIcon: '🎉',
      cssClass: 'note-mover-update-modal',
      size: 'medium',
      ...options,
    });
    this.currentVersion = currentVersion;
    this.lastSeenVersion = lastSeenVersion;
    this.changelogEntries = changelogEntries;
  }

  protected createContent(): void {
    const { contentEl } = this;

    // Subtitle
    if (this.lastSeenVersion) {
      contentEl.createEl('p', {
        text: `What's new since version ${this.lastSeenVersion}?`,
        cls: 'advancedNoteMover-modal-subtitle',
      });
    } else {
      contentEl.createEl('p', {
        text: 'Here are the latest changes:',
        cls: 'advancedNoteMover-modal-subtitle',
      });
    }

    // Changelog Content
    const isMobile = MobileUtils.isMobile();
    const changelogContainer = contentEl.createEl('div', {
      cls: isMobile
        ? 'advancedNoteMover-changelog-container advancedNoteMover-changelog-container-mobile'
        : 'advancedNoteMover-changelog-container',
    });

    if (this.changelogEntries.length === 0) {
      changelogContainer.createEl('p', {
        text: 'No specific changelog information available.',
        cls: 'advancedNoteMover-no-changelog-text',
      });
    } else {
      this.renderChangelog(changelogContainer);
    }

    // Footer with links and button
    const footerContainer = contentEl.createEl('div', {
      cls: isMobile
        ? 'advancedNoteMover-modal-footer advancedNoteMover-modal-footer-mobile'
        : 'advancedNoteMover-modal-footer',
    });

    // GitHub Link
    const linkContainer = footerContainer.createEl('div', {
      cls: isMobile
        ? 'advancedNoteMover-update-modal-links advancedNoteMover-update-modal-links-mobile'
        : 'advancedNoteMover-update-modal-links',
    });
    const githubLink = linkContainer.createEl('a', {
      text: 'View full changelog on GitHub',
      href: 'https://github.com/bueckerlars/obsidian-note-mover-shortcut/releases',
      cls: isMobile
        ? 'advancedNoteMover-update-modal-github-link advancedNoteMover-update-modal-github-link-mobile'
        : 'advancedNoteMover-update-modal-github-link',
    });
    githubLink.setAttribute('target', '_blank');

    // Mobile: Make link larger and more touch-friendly
    if (isMobile) {
      githubLink.style.minHeight = '48px';
      githubLink.style.display = 'flex';
      githubLink.style.alignItems = 'center';
      githubLink.style.justifyContent = 'center';
      githubLink.style.padding = '12px';
    }

    // Close button
    if (isMobile) {
      // Mobile: Full-width button
      const closeSetting = new Setting(footerContainer).addButton(btn => {
        btn
          .setButtonText('Close')
          .setCta()
          .onClick(() => {
            this.close();
          });
      });
      const closeBtn = closeSetting.settingEl.querySelector('button');
      if (closeBtn) {
        closeBtn.style.width = '100%';
        closeBtn.style.minHeight = '48px';
      }
    } else {
      // Desktop: Original layout
      const buttonContainer = this.createButtonContainer(footerContainer);
      this.createButton(
        buttonContainer,
        'Close',
        () => {
          this.close();
        },
        {
          isPrimary: true,
        }
      );
    }
  }

  private renderMarkdownListItem(container: HTMLElement, markdown: string) {
    const item = container.createEl('li');
    MarkdownRenderer.renderMarkdown(
      markdown,
      item,
      '',
      this as unknown as Component
    );
  }

  private renderChangelog(container: HTMLElement) {
    const isMobile = MobileUtils.isMobile();
    this.changelogEntries.forEach(entry => {
      const versionContainer = container.createEl('div', {
        cls: isMobile
          ? 'advancedNoteMover-changelog-version advancedNoteMover-changelog-version-mobile'
          : 'advancedNoteMover-changelog-version',
      });

      versionContainer.createEl('h3', {
        text: `Version ${entry.version}`,
        cls: 'advancedNoteMover-changelog-version-title',
      });

      if (entry.changes.features && entry.changes.features.length > 0) {
        const featuresSection = versionContainer.createEl('div', {
          cls: 'advancedNoteMover-changelog-section',
        });
        featuresSection.createEl('h4', {
          text: '✨ New Features',
          cls: 'advancedNoteMover-changelog-section-title',
        });
        const featuresList = featuresSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.features.forEach(feature => {
          this.renderMarkdownListItem(featuresList, feature);
        });
      }

      if (entry.changes.improvements && entry.changes.improvements.length > 0) {
        const improvementsSection = versionContainer.createEl('div', {
          cls: 'advancedNoteMover-changelog-section',
        });
        improvementsSection.createEl('h4', {
          text: '⚡ Improvements',
          cls: 'advancedNoteMover-changelog-section-title',
        });
        const improvementsList = improvementsSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.improvements.forEach(improvement => {
          this.renderMarkdownListItem(improvementsList, improvement);
        });
      }

      if (entry.changes.bugFixes && entry.changes.bugFixes.length > 0) {
        const bugFixesSection = versionContainer.createEl('div', {
          cls: 'advancedNoteMover-changelog-section',
        });
        bugFixesSection.createEl('h4', {
          text: '🐛 Bug Fixes',
          cls: 'advancedNoteMover-changelog-section-title',
        });
        const bugFixesList = bugFixesSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.bugFixes.forEach(bugFix => {
          this.renderMarkdownListItem(bugFixesList, bugFix);
        });
      }

      if (entry.changes.changes && entry.changes.changes.length > 0) {
        const changesSection = versionContainer.createEl('div', {
          cls: 'advancedNoteMover-changelog-section',
        });
        changesSection.createEl('h4', {
          text: '🔄 Changes',
          cls: 'advancedNoteMover-changelog-section-title',
        });
        const changesList = changesSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.changes.forEach(change => {
          this.renderMarkdownListItem(changesList, change);
        });
      }

      if (entry.changes.fixes && entry.changes.fixes.length > 0) {
        const fixesSection = versionContainer.createEl('div', {
          cls: 'advancedNoteMover-changelog-section',
        });
        fixesSection.createEl('h4', {
          text: '🔧 Fixes',
          cls: 'advancedNoteMover-changelog-section-title',
        });
        const fixesList = fixesSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.fixes.forEach(fix => {
          this.renderMarkdownListItem(fixesList, fix);
        });
      }

      if (entry.changes.performance && entry.changes.performance.length > 0) {
        const performanceSection = versionContainer.createEl('div', {
          cls: 'advancedNoteMover-changelog-section',
        });
        performanceSection.createEl('h4', {
          text: '⚡ Performance',
          cls: 'advancedNoteMover-changelog-section-title',
        });
        const performanceList = performanceSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.performance.forEach(performance => {
          this.renderMarkdownListItem(performanceList, performance);
        });
      }
    });
  }

  onClose() {
    super.onClose();
  }
}
