import { HistoryEntry, BulkOperation } from '../types/HistoryEntry';
import NoteMoverShortcutPlugin from 'main';
import { createError, handleError } from '../utils/Error';
import { NoticeManager } from '../utils/NoticeManager';
import { HISTORY_CONSTANTS } from '../config/constants';
import { type OperationType } from '../types/Common';

export class HistoryManager {
    private history: HistoryEntry[] = [];
    private bulkOperations: BulkOperation[] = [];
    private isPluginMove = false; // Flag um Plugin-interne Verschiebungen zu erkennen
    private currentBulkOperationId: string | null = null;
    private currentBulkOperationType: OperationType | null = null;

    constructor(private plugin: NoteMoverShortcutPlugin) { }

    public loadHistoryFromSettings(): void {
        if (Array.isArray(this.plugin.settings.history)) {
            this.history = this.plugin.settings.history;
        } else {
            this.history = [];
        }
        
        // Load bulk operations from settings if available
        if (Array.isArray(this.plugin.settings.bulkOperations)) {
            this.bulkOperations = this.plugin.settings.bulkOperations;
        } else {
            this.bulkOperations = [];
        }
    }

    private async saveHistory(): Promise<void> {
        // Update plugin settings with current history and bulk operations
        (this.plugin.settings as any).history = this.history;
        (this.plugin.settings as any).bulkOperations = this.bulkOperations;
        await (this.plugin as any).save_settings();
    }

    public addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
        const timestamp = Date.now();
        const newEntry: HistoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp,
            bulkOperationId: this.currentBulkOperationId || undefined,
            operationType: this.currentBulkOperationType || 'single'
        };

        this.history.unshift(newEntry);
        
        // Add to current bulk operation if active
        if (this.currentBulkOperationId) {
            const bulkOp = this.bulkOperations.find(op => op.id === this.currentBulkOperationId);
            if (bulkOp) {
                bulkOp.entries.push(newEntry);
                bulkOp.totalFiles = bulkOp.entries.length;
            }
        }
        
        if (this.history.length > HISTORY_CONSTANTS.MAX_HISTORY_ENTRIES) {
            this.history.pop();
        }

        this.saveHistory();
    }

    /**
     * Markiert den Start einer Plugin-internen Verschiebung
     */
    public markPluginMoveStart(): void {
        this.isPluginMove = true;
    }

    /**
     * Markiert das Ende einer Plugin-internen Verschiebung
     */
    public markPluginMoveEnd(): void {
        this.isPluginMove = false;
    }

    /**
     * Fügt einen History-Eintrag hinzu, aber nur wenn es sich nicht um eine Plugin-interne Verschiebung handelt
     */
    public addEntryFromVaultEvent(sourcePath: string, destinationPath: string, fileName: string): void {
        if (this.isPluginMove) {
            // Plugin-interne Verschiebung, überspringen
            return;
        }

        // Prüfen ob es sich um eine echte Verschiebung handelt (verschiedene Ordner)
        const sourceFolder = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
        const destFolder = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
        
        if (sourceFolder === destFolder) {
            // Nur Umbenennung, keine Verschiebung
            return;
        }

        // Prüfen ob bereits ein Eintrag für diese Datei mit demselben Ziel existiert
        const existingEntry = this.history.find(entry => 
            entry.fileName === fileName && 
            entry.destinationPath === destinationPath &&
            Math.abs(Date.now() - entry.timestamp) < HISTORY_CONSTANTS.DUPLICATE_CHECK_WINDOW_MS // innerhalb einer Sekunde
        );

        if (existingEntry) {
            // Doppelter Eintrag, überspringen
            return;
        }

        this.addEntry({
            sourcePath,
            destinationPath,
            fileName
        });
    }

    public getHistory(): HistoryEntry[] {
        return [...this.history];
    }

    public async undoEntry(entryId: string): Promise<boolean> {
        const entryIndex = this.history.findIndex(entry => entry.id === entryId);
        if (entryIndex === -1) return false;

        const entry = this.history[entryIndex];
        const file = this.plugin.app.vault.getAbstractFileByPath(entry.destinationPath);
        
        if (!file) {
            handleError(createError(`File not found at path: ${entry.destinationPath}`), "undoEntry", false);
            return false;
        }

        // Check if source folder exists, create if necessary
        const sourceFolderPath = entry.sourcePath.substring(0, entry.sourcePath.lastIndexOf('/'));
        if (sourceFolderPath && sourceFolderPath !== '' && !await this.plugin.app.vault.adapter.exists(sourceFolderPath)) {
            try {
                NoticeManager.info(`Creating source folder for individual undo: ${sourceFolderPath}`);
                await this.plugin.app.vault.createFolder(sourceFolderPath);
            } catch (error) {
                handleError(error, `Failed to create source folder ${sourceFolderPath}`, false);
                return false;
            }
        }

        try {
            this.markPluginMoveStart();
            await this.plugin.app.fileManager.renameFile(
                file,
                entry.sourcePath
            );
            
            // Remove from individual history
            this.history.splice(entryIndex, 1);
            
            // If this entry belongs to a bulk operation, remove it from there too
            if (entry.bulkOperationId) {
                const bulkOp = this.bulkOperations.find(op => op.id === entry.bulkOperationId);
                if (bulkOp) {
                    bulkOp.entries = bulkOp.entries.filter(e => e.id !== entryId);
                    bulkOp.totalFiles = bulkOp.entries.length;
                    
                    // If bulk operation is now empty, remove it entirely
                    if (bulkOp.entries.length === 0) {
                        const bulkOpIndex = this.bulkOperations.findIndex(op => op.id === entry.bulkOperationId);
                        if (bulkOpIndex !== -1) {
                            this.bulkOperations.splice(bulkOpIndex, 1);
                        }
                    }
                }
            }
            
            await this.saveHistory();
            return true;
        } catch (error) {
            handleError(error, "Fehler beim Rückgängigmachen", false);
            return false;
        } finally {
            this.markPluginMoveEnd();
        }
    }

    public getLastEntryForFile(fileName: string): HistoryEntry | undefined {
        return this.history.find(entry => entry.fileName === fileName);
    }

    public async undoLastMove(fileName: string): Promise<boolean> {
        const entry = this.getLastEntryForFile(fileName);
        if (!entry) {
            handleError(createError(`No history entry found for file: ${fileName}`), "undoLastMove", false);
            return false;
        }

        const file = this.plugin.app.vault.getAbstractFileByPath(entry.destinationPath);
        if (!file) {
            handleError(createError(`File not found at path: ${entry.destinationPath}`), "undoLastMove", false);
            return false;
        }

        // Check if source folder exists, create if necessary
        const sourceFolderPath = entry.sourcePath.substring(0, entry.sourcePath.lastIndexOf('/'));
        if (sourceFolderPath && sourceFolderPath !== '' && !await this.plugin.app.vault.adapter.exists(sourceFolderPath)) {
            try {
                NoticeManager.info(`Creating source folder for undo: ${sourceFolderPath}`);
                await this.plugin.app.vault.createFolder(sourceFolderPath);
            } catch (error) {
                handleError(error, `Failed to create source folder ${sourceFolderPath}`, false);
                return false;
            }
        }

        try {
            NoticeManager.info(`Attempting to move file from ${entry.destinationPath} to ${entry.sourcePath}`);
            this.markPluginMoveStart();
            await this.plugin.app.fileManager.renameFile(
                file,
                entry.sourcePath
            );
            
            // Remove the entry from history
            const entryIndex = this.history.findIndex(e => e.id === entry.id);
            if (entryIndex !== -1) {
                this.history.splice(entryIndex, 1);
                await this.saveHistory();
            }
            
            NoticeManager.success('Move successful');
            return true;
        } catch (error) {
            handleError(error, "Error during undo", false);
            return false;
        } finally {
            this.markPluginMoveEnd();
        }
    }

    public async clearHistory(): Promise<void> {
        this.history = [];
        this.bulkOperations = [];
        await this.saveHistory();
    }

    /**
     * Starts a new bulk operation
     */
    public startBulkOperation(operationType: OperationType): string {
        const bulkOperationId = crypto.randomUUID();
        this.currentBulkOperationId = bulkOperationId;
        this.currentBulkOperationType = operationType;
        
        const bulkOp: BulkOperation = {
            id: bulkOperationId,
            operationType: operationType === 'single' ? 'bulk' : operationType,
            timestamp: Date.now(),
            entries: [],
            totalFiles: 0
        };
        
        this.bulkOperations.unshift(bulkOp);
        
        // Limit bulk operations history
        if (this.bulkOperations.length > HISTORY_CONSTANTS.MAX_BULK_OPERATIONS) {
            this.bulkOperations.pop();
        }
        
        return bulkOperationId;
    }

    /**
     * Ends the current bulk operation
     */
    public endBulkOperation(): void {
        if (this.currentBulkOperationId) {
            const bulkOp = this.bulkOperations.find(op => op.id === this.currentBulkOperationId);
            if (bulkOp && bulkOp.entries.length === 0) {
                // Remove empty bulk operations
                const index = this.bulkOperations.indexOf(bulkOp);
                this.bulkOperations.splice(index, 1);
            }
        }
        
        this.currentBulkOperationId = null;
        this.currentBulkOperationType = null;
        this.saveHistory();
    }

    /**
     * Gets all bulk operations
     */
    public getBulkOperations(): BulkOperation[] {
        return [...this.bulkOperations];
    }

    /**
     * Undoes an entire bulk operation
     */
    public async undoBulkOperation(bulkOperationId: string): Promise<boolean> {
        const bulkOp = this.bulkOperations.find(op => op.id === bulkOperationId);
        if (!bulkOp) {
            handleError(createError(`Bulk operation with ID ${bulkOperationId} not found`), "undoBulkOperation", false);
            return false;
        }

        NoticeManager.info(`Starting bulk undo for operation: ${bulkOp.id}, ${bulkOp.entries.length} entries`);
        
        const results: boolean[] = [];
        
        // Undo entries in reverse order (last moved files first)
        const sortedEntries = [...bulkOp.entries].sort((a, b) => b.timestamp - a.timestamp);
        
        for (const entry of sortedEntries) {
            NoticeManager.info(`Attempting to undo: ${entry.fileName} from ${entry.destinationPath} to ${entry.sourcePath}`);
            
            const file = this.plugin.app.vault.getAbstractFileByPath(entry.destinationPath);
            if (!file) {
                handleError(createError(`File not found at destination path: ${entry.destinationPath}`), "undoBulkOperation", false);
                results.push(false);
                continue;
            }

            // Check if source folder exists, create if necessary
            const sourceFolderPath = entry.sourcePath.substring(0, entry.sourcePath.lastIndexOf('/'));
            if (sourceFolderPath && sourceFolderPath !== '' && !await this.plugin.app.vault.adapter.exists(sourceFolderPath)) {
                try {
                    NoticeManager.info(`Creating source folder: ${sourceFolderPath}`);
                    await this.plugin.app.vault.createFolder(sourceFolderPath);
                } catch (error) {
                    handleError(error, `Failed to create source folder ${sourceFolderPath}`, false);
                    results.push(false);
                    continue;
                }
            }

            try {
                this.markPluginMoveStart();
                await this.plugin.app.fileManager.renameFile(file, entry.sourcePath);
                NoticeManager.success(`Successfully moved ${entry.fileName} back to ${entry.sourcePath}`);
                
                // Remove from individual history
                const historyIndex = this.history.findIndex(h => h.id === entry.id);
                if (historyIndex !== -1) {
                    this.history.splice(historyIndex, 1);
                }
                
                results.push(true);
            } catch (error) {
                handleError(error, `Error undoing move for ${entry.fileName}`, false);
                results.push(false);
            } finally {
                this.markPluginMoveEnd();
            }
        }

        // Only remove the bulk operation if at least some operations were successful
        const successCount = results.filter(r => r).length;
        NoticeManager.info(`Bulk undo completed: ${successCount}/${results.length} successful`);
        
        if (successCount > 0) {
            // Create a map of successfully undone entries by ID
            const successfulUndoIds = new Set<string>();
            sortedEntries.forEach((entry, index) => {
                if (results[index]) {
                    successfulUndoIds.add(entry.id);
                }
            });
            
            // Remove successfully undone entries from the bulk operation
            const remainingEntries = bulkOp.entries.filter(entry => !successfulUndoIds.has(entry.id));
            
            if (remainingEntries.length === 0) {
                // All entries were undone, remove the entire bulk operation
                const bulkOpIndex = this.bulkOperations.findIndex(op => op.id === bulkOperationId);
                if (bulkOpIndex !== -1) {
                    this.bulkOperations.splice(bulkOpIndex, 1);
                }
            } else {
                // Update bulk operation with remaining entries
                bulkOp.entries = remainingEntries;
                bulkOp.totalFiles = remainingEntries.length;
            }
        }

        await this.saveHistory();
        
        // Return true if all operations were successful
        return results.every(r => r);
    }
} 