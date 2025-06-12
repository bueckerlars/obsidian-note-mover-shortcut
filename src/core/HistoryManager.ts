import { HistoryEntry } from '../types/HistoryEntry';
import { Plugin } from 'obsidian';

export class HistoryManager {
    private history: HistoryEntry[] = [];
    private readonly MAX_HISTORY_ENTRIES = 50;

    constructor(private plugin: Plugin) {
        this.loadHistory();
    }

    private async loadHistory(): Promise<void> {
        const savedHistory = await this.plugin.loadData();
        if (savedHistory?.history) {
            this.history = savedHistory.history;
        }
    }

    private async saveHistory(): Promise<void> {
        await this.plugin.saveData({ history: this.history });
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
} 