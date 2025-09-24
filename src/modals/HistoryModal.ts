import { Setting, App } from 'obsidian';
import { HistoryManager } from '../core/HistoryManager';
import { BulkOperation, HistoryEntry } from '../types/HistoryEntry';
import { NoticeManager } from '../utils/NoticeManager';
import { NOTIFICATION_CONSTANTS, SETTINGS_CONSTANTS } from '../config/constants';
import { BaseModal, BaseModalOptions } from './BaseModal';

export class HistoryModal extends BaseModal {
    constructor(
        app: App,
        private historyManager: HistoryManager,
        options: BaseModalOptions = {}
    ) {
        super(app, {
            title: 'NoteMover History',
            cssClass: 'note-mover-history-modal',
            size: 'large',
            ...options
        });
    }

    protected createContent(): void {
        const { contentEl } = this;

        const history = this.historyManager.getHistory();
        const bulkOperations = this.historyManager.getBulkOperations();
        
        if (history.length === 0 && bulkOperations.length === 0) {
            contentEl.createEl('p', { text: 'No history entries available.' });
            return;
        }

        const historyList = contentEl.createEl('div', { cls: 'history-list' });

        // Create a combined list of operations sorted by timestamp
        const allOperations: Array<{type: 'bulk', data: BulkOperation} | {type: 'single', data: HistoryEntry}> = [];
        
        // Add bulk operations
        bulkOperations.forEach(bulkOp => {
            allOperations.push({type: 'bulk', data: bulkOp});
        });
        
        // Add ONLY single operations that are NOT part of any bulk operation
        const singleEntries = history.filter(entry => !entry.bulkOperationId);
        singleEntries.forEach(entry => {
            allOperations.push({type: 'single', data: entry});
        });
        
        // Sort by timestamp (most recent first)
        allOperations.sort((a, b) => b.data.timestamp - a.data.timestamp);

        allOperations.forEach(operation => {
            if (operation.type === 'bulk') {
                this.createBulkOperationEntry(historyList, operation.data);
            } else {
                this.createSingleEntry(historyList, operation.data);
            }
        });
    }

    private createBulkOperationEntry(container: HTMLElement, bulkOp: BulkOperation) {
        const bulkEntryEl = container.createEl('div', { cls: 'history-entry bulk-operation' });
        
        const headerEl = bulkEntryEl.createEl('div', { cls: 'bulk-header' });
        const date = new Date(bulkOp.timestamp);
        const formattedDate = date.toLocaleString('en-US');
        
        const operationTypeText = bulkOp.operationType === 'bulk' ? 'Bulk Move' : 'Periodic Move';
        const operationIcon = bulkOp.operationType === 'bulk' ? '📦' : '🕐';
        
        headerEl.createEl('div', { 
            cls: 'bulk-operation-info',
            text: `${operationIcon} ${operationTypeText}: ${bulkOp.totalFiles} files - ${formattedDate}`
        });

        // Expandable details (opened by default)
        const detailsEl = bulkEntryEl.createEl('details', { cls: 'bulk-details' });
        detailsEl.open = true;
        const summaryEl = detailsEl.createEl('summary', { text: 'Hide files' });
        const filesListEl = detailsEl.createEl('div', { cls: 'bulk-files-list' });
        
        // Update summary text based on open state
        detailsEl.addEventListener('toggle', () => {
            summaryEl.textContent = detailsEl.open ? 'Hide files' : 'Show files';
        });
        
        // Sort entries by timestamp for consistent display
        const sortedEntries = [...bulkOp.entries].sort((a, b) => a.timestamp - b.timestamp);
        
        sortedEntries.forEach(entry => {
            const fileEl = filesListEl.createEl('div', { cls: 'history-entry bulk-file-entry' });
            
            const contentEl = fileEl.createEl('div', { cls: 'history-entry-content' });
            const date = new Date(entry.timestamp);
            const formattedDate = date.toLocaleString('en-US');
            
            contentEl.createEl('div', { 
                cls: 'history-entry-info',
                text: `📄 ${entry.fileName} - ${formattedDate}`
            });
            
            contentEl.createEl('div', { 
                cls: 'history-entry-paths',
                text: `${entry.sourcePath} → ${entry.destinationPath}`
            });
            
            // Individual buttons for each file
            new Setting(fileEl)
                .addButton(button => {
                    button
                        .setIcon('file-text')
                        .setTooltip(`Open ${entry.fileName}`)
                        .onClick(() => {
                            // Try to open the file at its current location (destination path)
                            const file = this.app.vault.getAbstractFileByPath(entry.destinationPath);
                            if (file) {
                                this.app.workspace.getLeaf().openFile(file);
                                this.close(); // Close the modal after opening the file
                            } else {
                                // If file not found at destination, try source path
                                const sourceFile = this.app.vault.getAbstractFileByPath(entry.sourcePath);
                                if (sourceFile) {
                                    this.app.workspace.getLeaf().openFile(sourceFile);
                                    this.close(); // Close the modal after opening the file
                                } else {
                                    NoticeManager.error(`Could not find file ${entry.fileName}`, { duration: NOTIFICATION_CONSTANTS.CSS_STYLES.DURATION_OVERRIDE });
                                }
                            }
                        });
                })
                .addButton(button => {
                    button
                        .setIcon('undo')
                        .setTooltip(`Undo move for ${entry.fileName}`)
                        .onClick(async () => {
                            const success = await this.historyManager.undoEntry(entry.id);
                            if (success) {
                                this.onOpen(); // Refresh the modal
                            } else {
                                // Show error message
                                NoticeManager.error(`Could not undo move for ${entry.fileName}. File may have been moved or deleted.`, { duration: NOTIFICATION_CONSTANTS.CSS_STYLES.DURATION_OVERRIDE });
                            }
                        });
                });
        });

        // Bulk undo button
        new Setting(bulkEntryEl)
            .addButton(button => {
                button
                    .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.UNDO_ALL)
                    .setIcon('undo')
                    .setTooltip(`Undo entire ${operationTypeText.toLowerCase()}`)
                    .onClick(async () => {
                        const success = await this.historyManager.undoBulkOperation(bulkOp.id);
                        if (success) {
                            this.onOpen(); // Refresh the modal
                        } else {
                            // Show error message
                            NoticeManager.warning('Some files could not be moved back. Check console for details.', { duration: NOTIFICATION_CONSTANTS.CSS_STYLES.DURATION_OVERRIDE });
                        }
                    });
            });
    }

    private createSingleEntry(container: HTMLElement, entry: HistoryEntry) {
        const entryEl = container.createEl('div', { cls: 'history-entry single-operation' });
        
        const contentEl = entryEl.createEl('div', { cls: 'history-entry-content' });
        const date = new Date(entry.timestamp);
        const formattedDate = date.toLocaleString('en-US');

        contentEl.createEl('div', { 
            cls: 'history-entry-info',
            text: `📄 ${entry.fileName} - ${formattedDate}`
        });

        contentEl.createEl('div', { 
            cls: 'history-entry-paths',
            text: `${entry.sourcePath} → ${entry.destinationPath}`
        });

        new Setting(entryEl)
            .addButton(button => {
                button
                    .setIcon('file-text')
                    .setTooltip(`Open ${entry.fileName}`)
                    .onClick(() => {
                        // Try to open the file at its current location (destination path)
                        const file = this.app.vault.getAbstractFileByPath(entry.destinationPath);
                        if (file) {
                            this.app.workspace.getLeaf().openFile(file);
                            this.close(); // Close the modal after opening the file
                        } else {
                            // If file not found at destination, try source path
                            const sourceFile = this.app.vault.getAbstractFileByPath(entry.sourcePath);
                            if (sourceFile) {
                                this.app.workspace.getLeaf().openFile(sourceFile);
                                this.close(); // Close the modal after opening the file
                            } else {
                                NoticeManager.error(`Could not find file ${entry.fileName}`, { duration: NOTIFICATION_CONSTANTS.CSS_STYLES.DURATION_OVERRIDE });
                            }
                        }
                    });
            })
            .addButton(button => {
                button
                    .setIcon('undo')
                    .setTooltip('Undo')
                    .onClick(async () => {
                        const success = await this.historyManager.undoEntry(entry.id);
                        if (success) {
                            this.onOpen();
                        }
                    });
            });
    }

    onClose() {
        super.onClose();
    }
} 