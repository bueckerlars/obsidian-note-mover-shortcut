import { HistoryEntry } from '../types/HistoryEntry';
import NoteMoverShortcutPlugin from 'main';

export class HistoryManager {
    private history: HistoryEntry[] = [];
    private readonly MAX_HISTORY_ENTRIES = 50;
    private isPluginMove = false; // Flag um Plugin-interne Verschiebungen zu erkennen

    constructor(private plugin: NoteMoverShortcutPlugin) { }

    public loadHistoryFromSettings(): void {
        if (Array.isArray(this.plugin.settings.history)) {
            this.history = this.plugin.settings.history;
        } else {
            this.history = [];
        }
    }

    private async saveHistory(): Promise<void> {    
        await (this.plugin as any).save_settings();
    }

    public addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
        const newEntry: HistoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };

        this.history.unshift(newEntry);
        
        if (this.history.length > this.MAX_HISTORY_ENTRIES) {
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
            Math.abs(Date.now() - entry.timestamp) < 1000 // innerhalb einer Sekunde
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
        
        if (!file) return false;

        try {
            await this.plugin.app.fileManager.renameFile(
                file,
                entry.sourcePath
            );
            
            this.history.splice(entryIndex, 1);
            await this.saveHistory();
            return true;
        } catch (error) {
            console.error('Fehler beim Rückgängigmachen:', error);
            return false;
        }
    }

    public getLastEntryForFile(fileName: string): HistoryEntry | undefined {
        return this.history.find(entry => entry.fileName === fileName);
    }

    public async undoLastMove(fileName: string): Promise<boolean> {
        const entry = this.getLastEntryForFile(fileName);
        if (!entry) {
            console.log(`No history entry found for file: ${fileName}`);
            return false;
        }

        const file = this.plugin.app.vault.getAbstractFileByPath(entry.destinationPath);
        if (!file) {
            console.log(`File not found at path: ${entry.destinationPath}`);
            return false;
        }

        try {
            console.log(`Attempting to move file from ${entry.destinationPath} to ${entry.sourcePath}`);
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
            
            console.log('Move successful');
            return true;
        } catch (error) {
            console.error('Error during undo:', error);
            return false;
        }
    }

    public async clearHistory(): Promise<void> {
        this.history = [];
        await this.saveHistory();
    }
} 