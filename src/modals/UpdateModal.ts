import { Setting, App, MarkdownRenderer, Component, setIcon } from 'obsidian';
import { strings } from '../i18n/locale';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';
import type { ChangelogEntry } from '../generated/changelog';

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
      titleIcon: 'party-popper',
      cssClass: 'advancedNoteMover-update-modal',
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
    void MarkdownRenderer.render(
      this.app,
      markdown,
      item,
      '',
      this as unknown as Component
    );
  }

  private createChangelogHeading(
    parent: HTMLElement,
    icon: string,
    text: string
  ): void {
    const heading = parent.createEl('h4', {
      cls: 'advancedNoteMover-changelog-section-title',
    });
    const iconEl = heading.createSpan({ cls: 'advancedNoteMover-icon' });
    iconEl.ariaHidden = 'true';
    setIcon(iconEl, icon);
    heading.createSpan({ text });
  }

  private renderChangelog(container: HTMLElement) {
    const isMobile = MobileUtils.isMobile();
    this.changelogEntries.forEach(entry => {
      const versionContainer = container.createDiv({
        cls: isMobile
          ? 'advancedNoteMover-changelog-version advancedNoteMover-changelog-version-mobile'
          : 'advancedNoteMover-changelog-version',
      });

      versionContainer.createEl('h3', {
        text: `Version ${entry.version}`,
        cls: 'advancedNoteMover-changelog-version-title',
      });

      if (entry.changes.breaking && entry.changes.breaking.length > 0) {
        const breakingSection = versionContainer.createDiv({
          cls: 'advancedNoteMover-changelog-section advancedNoteMover-changelog-section-breaking',
        });
        this.createChangelogHeading(
          breakingSection,
          'alert-triangle',
          strings().modals.updateBreaking
        );
        const breakingList = breakingSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.breaking.forEach(item => {
          this.renderMarkdownListItem(breakingList, item);
        });
      }

      if (entry.changes.features && entry.changes.features.length > 0) {
        const featuresSection = versionContainer.createDiv({
          cls: 'advancedNoteMover-changelog-section',
        });
        this.createChangelogHeading(
          featuresSection,
          'sparkles',
          strings().modals.updateFeatures
        );
        const featuresList = featuresSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.features.forEach(feature => {
          this.renderMarkdownListItem(featuresList, feature);
        });
      }

      if (entry.changes.improvements && entry.changes.improvements.length > 0) {
        const improvementsSection = versionContainer.createDiv({
          cls: 'advancedNoteMover-changelog-section',
        });
        this.createChangelogHeading(
          improvementsSection,
          'zap',
          strings().modals.updateImprovements
        );
        const improvementsList = improvementsSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.improvements.forEach(improvement => {
          this.renderMarkdownListItem(improvementsList, improvement);
        });
      }

      if (entry.changes.bugFixes && entry.changes.bugFixes.length > 0) {
        const bugFixesSection = versionContainer.createDiv({
          cls: 'advancedNoteMover-changelog-section',
        });
        this.createChangelogHeading(
          bugFixesSection,
          'bug',
          strings().modals.updateBugFixes
        );
        const bugFixesList = bugFixesSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.bugFixes.forEach(bugFix => {
          this.renderMarkdownListItem(bugFixesList, bugFix);
        });
      }

      if (entry.changes.changes && entry.changes.changes.length > 0) {
        const changesSection = versionContainer.createDiv({
          cls: 'advancedNoteMover-changelog-section',
        });
        this.createChangelogHeading(
          changesSection,
          'refresh-cw',
          strings().modals.updateChanges
        );
        const changesList = changesSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.changes.forEach(change => {
          this.renderMarkdownListItem(changesList, change);
        });
      }

      if (entry.changes.fixes && entry.changes.fixes.length > 0) {
        const fixesSection = versionContainer.createDiv({
          cls: 'advancedNoteMover-changelog-section',
        });
        this.createChangelogHeading(
          fixesSection,
          'wrench',
          strings().modals.updateFixes
        );
        const fixesList = fixesSection.createEl('ul', {
          cls: 'advancedNoteMover-changelog-list',
        });
        entry.changes.fixes.forEach(fix => {
          this.renderMarkdownListItem(fixesList, fix);
        });
      }

      if (entry.changes.performance && entry.changes.performance.length > 0) {
        const performanceSection = versionContainer.createDiv({
          cls: 'advancedNoteMover-changelog-section',
        });
        this.createChangelogHeading(
          performanceSection,
          'zap',
          strings().modals.updatePerformance
        );
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
