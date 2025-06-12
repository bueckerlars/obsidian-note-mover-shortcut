import { Modal, Setting, App } from 'obsidian';
import { HistoryManager } from '../core/HistoryManager';

export class HistoryModal extends Modal {
    constructor(
        app: App,
        private historyManager: HistoryManager,
        private onUndo: (entryId: string) => Promise<void>
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-mover-history-modal');

        // Modal-Container direkt ansprechen und Breite setzen
        const modalContainer = contentEl.parentElement;
        if (modalContainer) {
            modalContainer.style.minWidth = '700px';
            modalContainer.style.width = '900px';
            modalContainer.style.maxWidth = '95vw';
        }

        const history = this.historyManager.getHistory();

        if (history.length === 0) {
            contentEl.createEl('p', { text: 'Keine Verlaufseinträge vorhanden.' });
            return;
        }

        const historyList = contentEl.createEl('div', { cls: 'history-list' });

        history.forEach(entry => {
            const entryEl = historyList.createEl('div', { cls: 'history-entry' });
            
            const contentEl = entryEl.createEl('div', { cls: 'history-entry-content' });
            const date = new Date(entry.timestamp);
            const formattedDate = date.toLocaleString('de-DE');

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
                        .setTooltip('Rückgängig')
                        .onClick(async () => {
                            await this.onUndo(entry.id);
                            this.onOpen(); // Aktualisiere die Ansicht
                        });
                });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 