import { Modal, Setting, App } from 'obsidian';
import { HistoryManager } from '../core/HistoryManager';

export class HistoryModal extends Modal {
    constructor(
        app: App,
        private historyManager: HistoryManager
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-mover-history-modal');

        // Title
        const titleEl = contentEl.createEl('h2', { text: 'NoteMover History', cls: 'note-mover-history-title' });

        // Modal-Container
        const modalContainer = contentEl.parentElement;
        if (modalContainer) {
            modalContainer.style.minWidth = '700px';
            modalContainer.style.width = '900px';
            modalContainer.style.maxWidth = '95vw';
        }

        const history = this.historyManager.getHistory();

        if (history.length === 0) {
            contentEl.createEl('p', { text: 'No history entries available.' });
            return;
        }

        const historyList = contentEl.createEl('div', { cls: 'history-list' });

        history.forEach(entry => {
            const entryEl = historyList.createEl('div', { cls: 'history-entry' });
            
            const contentEl = entryEl.createEl('div', { cls: 'history-entry-content' });
            const date = new Date(entry.timestamp);
            const formattedDate = date.toLocaleString('en-US');

            contentEl.createEl('div', { 
                cls: 'history-entry-info',
                text: `${entry.fileName} - ${formattedDate}`
            });

            contentEl.createEl('div', { 
                cls: 'history-entry-paths',
                text: `${entry.sourcePath} → ${entry.destinationPath}`
            });

            new Setting(entryEl)
                .addButton(button => {
                    button
                        .setIcon('undo')
                        .setTooltip('Undo')
                        .onClick(async () => {
                            const success = await this.historyManager.undoLastMove(entry.fileName);
                            if (success) {
                                this.onOpen();
                            }
                        });
                });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 