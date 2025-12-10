import { Setting, App, ButtonComponent } from 'obsidian';
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
      title: `NoteMover updated to version ${currentVersion}!`,
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
        cls: 'modal-subtitle',
      });
    } else {
      contentEl.createEl('p', {
        text: 'Here are the latest changes:',
        cls: 'modal-subtitle',
      });
    }

    // Changelog Content
    const isMobile = MobileUtils.isMobile();
    const changelogContainer = contentEl.createEl('div', {
      cls: isMobile
        ? 'changelog-container changelog-container-mobile'
        : 'changelog-container',
    });

    if (this.changelogEntries.length === 0) {
      changelogContainer.createEl('p', {
        text: 'No specific changelog information available.',
        cls: 'no-changelog-text',
      });
    } else {
      this.renderChangelog(changelogContainer);
    }

    // Footer with links and button
    const footerContainer = contentEl.createEl('div', {
      cls: isMobile ? 'modal-footer modal-footer-mobile' : 'modal-footer',
    });

    // GitHub Link
    const linkContainer = footerContainer.createEl('div', {
      cls: isMobile
        ? 'update-modal-links update-modal-links-mobile'
        : 'update-modal-links',
    });
    const githubLink = linkContainer.createEl('a', {
      text: 'View full changelog on GitHub',
      href: 'https://github.com/bueckerlars/obsidian-note-mover-shortcut/releases',
      cls: isMobile
        ? 'update-modal-github-link update-modal-github-link-mobile'
        : 'update-modal-github-link',
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

  private renderChangelog(container: HTMLElement) {
    const isMobile = MobileUtils.isMobile();
    this.changelogEntries.forEach(entry => {
      const versionContainer = container.createEl('div', {
        cls: isMobile
          ? 'changelog-version changelog-version-mobile'
          : 'changelog-version',
      });

      versionContainer.createEl('h3', {
        text: `Version ${entry.version}`,
        cls: 'changelog-version-title',
      });

      if (entry.changes.features && entry.changes.features.length > 0) {
        const featuresSection = versionContainer.createEl('div', {
          cls: 'changelog-section',
        });
        featuresSection.createEl('h4', {
          text: '✨ New Features',
          cls: 'changelog-section-title',
        });
        const featuresList = featuresSection.createEl('ul', {
          cls: 'changelog-list',
        });
        entry.changes.features.forEach(feature => {
          featuresList.createEl('li', { text: feature });
        });
      }

      if (entry.changes.improvements && entry.changes.improvements.length > 0) {
        const improvementsSection = versionContainer.createEl('div', {
          cls: 'changelog-section',
        });
        improvementsSection.createEl('h4', {
          text: '⚡ Improvements',
          cls: 'changelog-section-title',
        });
        const improvementsList = improvementsSection.createEl('ul', {
          cls: 'changelog-list',
        });
        entry.changes.improvements.forEach(improvement => {
          improvementsList.createEl('li', { text: improvement });
        });
      }

      if (entry.changes.bugFixes && entry.changes.bugFixes.length > 0) {
        const bugFixesSection = versionContainer.createEl('div', {
          cls: 'changelog-section',
        });
        bugFixesSection.createEl('h4', {
          text: '🐛 Bug Fixes',
          cls: 'changelog-section-title',
        });
        const bugFixesList = bugFixesSection.createEl('ul', {
          cls: 'changelog-list',
        });
        entry.changes.bugFixes.forEach(bugFix => {
          bugFixesList.createEl('li', { text: bugFix });
        });
      }

      if (entry.changes.changes && entry.changes.changes.length > 0) {
        const changesSection = versionContainer.createEl('div', {
          cls: 'changelog-section',
        });
        changesSection.createEl('h4', {
          text: '🔄 Changes',
          cls: 'changelog-section-title',
        });
        const changesList = changesSection.createEl('ul', {
          cls: 'changelog-list',
        });
        entry.changes.changes.forEach(change => {
          changesList.createEl('li', { text: change });
        });
      }

      if (entry.changes.fixes && entry.changes.fixes.length > 0) {
        const fixesSection = versionContainer.createEl('div', {
          cls: 'changelog-section',
        });
        fixesSection.createEl('h4', {
          text: '🔧 Fixes',
          cls: 'changelog-section-title',
        });
        const fixesList = fixesSection.createEl('ul', {
          cls: 'changelog-list',
        });
        entry.changes.fixes.forEach(fix => {
          fixesList.createEl('li', { text: fix });
        });
      }

      if (entry.changes.performance && entry.changes.performance.length > 0) {
        const performanceSection = versionContainer.createEl('div', {
          cls: 'changelog-section',
        });
        performanceSection.createEl('h4', {
          text: '⚡ Performance',
          cls: 'changelog-section-title',
        });
        const performanceList = performanceSection.createEl('ul', {
          cls: 'changelog-list',
        });
        entry.changes.performance.forEach(performance => {
          performanceList.createEl('li', { text: performance });
        });
      }
    });
  }

  onClose() {
    super.onClose();
  }
}
