import { Modal, Setting, App, ButtonComponent } from 'obsidian';

interface ChangelogEntry {
    version: string;
    changes: {
        features?: string[];
        bugFixes?: string[];
        improvements?: string[];
    };
}

export class UpdateModal extends Modal {
    private currentVersion: string;
    private lastSeenVersion: string;
    private changelogEntries: ChangelogEntry[];

    constructor(
        app: App,
        currentVersion: string,
        lastSeenVersion: string,
        changelogEntries: ChangelogEntry[]
    ) {
        super(app);
        this.currentVersion = currentVersion;
        this.lastSeenVersion = lastSeenVersion;
        this.changelogEntries = changelogEntries;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-mover-update-modal');

        // Modal-Container
        const modalContainer = contentEl.parentElement;
        if (modalContainer) {
            modalContainer.style.minWidth = '600px';
            modalContainer.style.width = '800px';
            modalContainer.style.maxWidth = '95vw';
        }

        // Title with icon
        const titleContainer = contentEl.createEl('div', { cls: 'update-modal-title-container' });
        const titleIcon = titleContainer.createEl('span', { cls: 'update-modal-icon' });
        titleIcon.innerHTML = '🎉';
        titleContainer.createEl('h2', { 
            text: `NoteMover updated to version ${this.currentVersion}!`, 
            cls: 'update-modal-title' 
        });

        // Subtitle
        if (this.lastSeenVersion) {
            contentEl.createEl('p', { 
                text: `What's new since version ${this.lastSeenVersion}?`, 
                cls: 'update-modal-subtitle' 
            });
        } else {
            contentEl.createEl('p', { 
                text: 'Here are the latest changes:', 
                cls: 'update-modal-subtitle' 
            });
        }

        // Changelog Content
        const changelogContainer = contentEl.createEl('div', { cls: 'changelog-container' });
        
        if (this.changelogEntries.length === 0) {
            changelogContainer.createEl('p', { 
                text: 'No specific changelog information available.', 
                cls: 'no-changelog-text' 
            });
        } else {
            this.renderChangelog(changelogContainer);
        }

        // Footer with links and button
        const footerContainer = contentEl.createEl('div', { cls: 'update-modal-footer' });
        
        // GitHub Link
        const linkContainer = footerContainer.createEl('div', { cls: 'update-modal-links' });
        const githubLink = linkContainer.createEl('a', {
            text: 'View full changelog on GitHub',
            href: 'https://github.com/bueckerlars/obsidian-note-mover-shortcut/releases',
            cls: 'update-modal-github-link'
        });
        githubLink.setAttribute('target', '_blank');

        // Close button
        const buttonContainer = footerContainer.createEl('div', { cls: 'update-modal-button-container' });
        new Setting(buttonContainer)
            .addButton((button: ButtonComponent) => {
                return button
                    .setButtonText('Close')
                    .setCta()
                    .onClick(() => {
                        this.close();
                    });
            });
    }

    private renderChangelog(container: HTMLElement) {
        this.changelogEntries.forEach(entry => {
            const versionContainer = container.createEl('div', { cls: 'changelog-version' });
            
            versionContainer.createEl('h3', { 
                text: `Version ${entry.version}`, 
                cls: 'changelog-version-title' 
            });

            if (entry.changes.features && entry.changes.features.length > 0) {
                const featuresSection = versionContainer.createEl('div', { cls: 'changelog-section' });
                featuresSection.createEl('h4', { text: '✨ New Features', cls: 'changelog-section-title' });
                const featuresList = featuresSection.createEl('ul', { cls: 'changelog-list' });
                entry.changes.features.forEach(feature => {
                    featuresList.createEl('li', { text: feature });
                });
            }

            if (entry.changes.improvements && entry.changes.improvements.length > 0) {
                const improvementsSection = versionContainer.createEl('div', { cls: 'changelog-section' });
                improvementsSection.createEl('h4', { text: '⚡ Improvements', cls: 'changelog-section-title' });
                const improvementsList = improvementsSection.createEl('ul', { cls: 'changelog-list' });
                entry.changes.improvements.forEach(improvement => {
                    improvementsList.createEl('li', { text: improvement });
                });
            }

            if (entry.changes.bugFixes && entry.changes.bugFixes.length > 0) {
                const bugFixesSection = versionContainer.createEl('div', { cls: 'changelog-section' });
                bugFixesSection.createEl('h4', { text: '🐛 Bug Fixes', cls: 'changelog-section-title' });
                const bugFixesList = bugFixesSection.createEl('ul', { cls: 'changelog-list' });
                entry.changes.bugFixes.forEach(bugFix => {
                    bugFixesList.createEl('li', { text: bugFix });
                });
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
