import { Modal, Setting, App, ButtonComponent, TFile, Notice } from 'obsidian';
import { MovePreview, PreviewEntry } from '../types/MovePreview';
import NoteMoverShortcutPlugin from 'main';
import { NoticeManager } from '../utils/NoticeManager';

export class PreviewModal extends Modal {
    private movePreview: MovePreview;

    constructor(
        app: App,
        private plugin: NoteMoverShortcutPlugin,
        movePreview: MovePreview
    ) {
        super(app);
        this.movePreview = movePreview;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-mover-preview-modal');

        // Set modal size
        const modalContainer = contentEl.parentElement;
        if (modalContainer) {
            modalContainer.style.minWidth = '700px';
            modalContainer.style.width = '900px';
            modalContainer.style.maxWidth = '95vw';
        }

        // Title
        const titleContainer = contentEl.createEl('div', { cls: 'preview-modal-title-container' });
        const titleIcon = titleContainer.createEl('span', { cls: 'preview-modal-icon' });
        titleIcon.innerHTML = '🔍';
        titleContainer.createEl('h2', { 
            text: 'Move Preview', 
            cls: 'preview-modal-title' 
        });

        // Subtitle with statistics
        const stats = this.movePreview;
        const subtitle = `${stats.totalFiles} files analyzed • ${stats.successfulMoves.length} will be moved • ${stats.blockedMoves.length} blocked`;
        contentEl.createEl('p', { 
            text: subtitle, 
            cls: 'preview-modal-subtitle' 
        });

        // Settings info
        const settingsInfo = contentEl.createEl('div', { cls: 'preview-modal-settings-info' });
        settingsInfo.innerHTML = `
            <div class="settings-row">
                <span>Rules enabled: ${stats.settings.enableRules ? '✅' : '❌'}</span>
                <span>Filter enabled: ${stats.settings.enableFilter ? '✅' : '❌'}</span>
                <span>Default destination: <code>${stats.settings.defaultDestination}</code></span>
            </div>
        `;

        // Successful moves section
        if (stats.successfulMoves.length > 0) {
            this.createSuccessfulMovesSection(contentEl, stats.successfulMoves);
        }

        // Blocked moves section
        if (stats.blockedMoves.length > 0) {
            this.createBlockedMovesSection(contentEl, stats.blockedMoves);
        }

        // No files message
        if (stats.totalFiles === 0) {
            contentEl.createEl('div', { 
                cls: 'preview-modal-empty',
                text: 'No files found to analyze.'
            });
        }

        // Action buttons
        this.createActionButtons(contentEl);
    }

    private createSuccessfulMovesSection(container: HTMLElement, entries: PreviewEntry[]) {
        const section = container.createEl('div', { cls: 'preview-section preview-section-success' });
        
        const header = section.createEl('div', { cls: 'preview-section-header' });
        header.innerHTML = `<h3>✅ Files to be moved (${entries.length})</h3>`;

        const list = section.createEl('div', { cls: 'preview-list' });
        
        entries.forEach(entry => {
            const item = list.createEl('div', { cls: 'preview-item preview-item-success' });
            
            const mainInfo = item.createEl('div', { cls: 'preview-item-main' });
            const fileName = mainInfo.createEl('div', { cls: 'preview-item-filename' });
            fileName.textContent = entry.fileName;
            
            const pathInfo = mainInfo.createEl('div', { cls: 'preview-item-paths' });
            pathInfo.innerHTML = `
                <span class="current-path">${entry.currentPath}</span>
                <span class="arrow">→</span>
                <span class="target-path">${entry.targetPath}</span>
            `;
            
            const details = item.createEl('div', { cls: 'preview-item-details' });
            
            if (entry.matchedRule) {
                const rule = details.createEl('div', { cls: 'preview-item-rule' });
                rule.innerHTML = `<span class="rule-label">Rule:</span> <code>${entry.matchedRule}</code>`;
            }
            
            if (entry.tags && entry.tags.length > 0) {
                const tags = details.createEl('div', { cls: 'preview-item-tags' });
                tags.innerHTML = `<span class="tags-label">Tags:</span> ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}`;
            }
        });
    }

    private createBlockedMovesSection(container: HTMLElement, entries: PreviewEntry[]) {
        const section = container.createEl('div', { cls: 'preview-section preview-section-blocked' });
        
        const header = section.createEl('div', { cls: 'preview-section-header' });
        header.innerHTML = `<h3>❌ Blocked files (${entries.length})</h3>`;

        const list = section.createEl('div', { cls: 'preview-list' });
        
        entries.forEach(entry => {
            const item = list.createEl('div', { cls: 'preview-item preview-item-blocked' });
            
            const mainInfo = item.createEl('div', { cls: 'preview-item-main' });
            const fileName = mainInfo.createEl('div', { cls: 'preview-item-filename' });
            fileName.textContent = entry.fileName;
            
            const pathInfo = mainInfo.createEl('div', { cls: 'preview-item-paths' });
            pathInfo.innerHTML = `<span class="current-path">${entry.currentPath}</span>`;
            
            const details = item.createEl('div', { cls: 'preview-item-details' });
            
            if (entry.blockReason) {
                const reason = details.createEl('div', { cls: 'preview-item-block-reason' });
                reason.innerHTML = `<span class="block-reason-label">Blocked:</span> ${entry.blockReason}`;
            }
            
            if (entry.blockingFilter) {
                const filter = details.createEl('div', { cls: 'preview-item-blocking-filter' });
                filter.innerHTML = `<span class="filter-label">Filter:</span> <code>${entry.blockingFilter}</code>`;
            }
            
            if (entry.tags && entry.tags.length > 0) {
                const tags = details.createEl('div', { cls: 'preview-item-tags' });
                tags.innerHTML = `<span class="tags-label">Tags:</span> ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}`;
            }
        });
    }

    private createActionButtons(container: HTMLElement) {
        const footer = container.createEl('div', { cls: 'preview-modal-footer' });
        
        const buttonContainer = footer.createEl('div', { cls: 'preview-modal-button-container' });
        
        // Cancel button
        new Setting(buttonContainer)
            .addButton(btn => {
                btn.setButtonText('Cancel');
                btn.onClick(() => {
                    this.close();
                });
            });

        // Execute moves button (only if there are moves to execute)
        if (this.movePreview.successfulMoves.length > 0) {
            new Setting(buttonContainer)
                .addButton(btn => {
                    btn.setButtonText(`Move ${this.movePreview.successfulMoves.length} files`);
                    btn.setCta();
                    btn.onClick(() => {
                        this.executeMoves();
                    });
                });
        }
    }

    private async executeMoves() {
        // Close modal first
        this.close();

        // Execute the moves for successful entries
        const successfulEntries = this.movePreview.successfulMoves;
        let movedCount = 0;
        let errorCount = 0;

        for (const entry of successfulEntries) {
            try {
                // Find the TFile for this entry
                const file = this.app.vault.getAbstractFileByPath(entry.currentPath);
                if (file && file instanceof TFile) {
                    // Use the existing move logic from NoteMoverShortcut
                    await this.plugin.noteMover.moveFileBasedOnTags(file, entry.targetPath || this.movePreview.settings.defaultDestination, true);
                    movedCount++;
                }
            } catch (error) {
                NoticeManager.error(`Error moving file ${entry.fileName}: ${error instanceof Error ? error.message : String(error)}`);
                errorCount++;
            }
        }

        // Show completion notice
        if (errorCount === 0) {
            NoticeManager.success(`Successfully moved ${movedCount} files!`);
        } else {
            NoticeManager.warning(`Moved ${movedCount} files with ${errorCount} errors. Check console for details.`);
        }
    }
}
