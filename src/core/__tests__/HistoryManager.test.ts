import { HistoryManager } from '../HistoryManager';
import { Plugin } from 'obsidian';
import { HistoryEntry } from '../../types/HistoryEntry';

let mockHistory: HistoryEntry[] = [];
let mockPlugin: Plugin;

describe('HistoryManager', () => {
    let historyManager: HistoryManager;

    beforeEach(() => {
        mockHistory = [];
        mockPlugin = {
            loadData: jest.fn().mockImplementation(() => Promise.resolve({ history: mockHistory })),
            saveData: jest.fn().mockImplementation((data) => {
                mockHistory = data.history;
                return Promise.resolve();
            }),
            app: {
                vault: {
                    getAbstractFileByPath: jest.fn().mockReturnValue({}),
                },
                fileManager: {
                    renameFile: jest.fn().mockResolvedValue(undefined),
                },
            },
        } as unknown as Plugin;
        historyManager = new HistoryManager(mockPlugin);
    });

    describe('addEntry', () => {
        it('sollte einen neuen Eintrag hinzufügen', () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            const history = historyManager.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toMatchObject(entry);
        });
    });

    describe('getHistory', () => {
        it('sollte den gesamten Verlauf zurückgeben', () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            const history = historyManager.getHistory();
            expect(history).toHaveLength(1);
        });
    });

    describe('undoEntry', () => {
        it('sollte einen Eintrag erfolgreich rückgängig machen', async () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            const history = historyManager.getHistory();
            const result = await historyManager.undoEntry(history[0].id);
            expect(result).toBe(true);
            expect(historyManager.getHistory()).toHaveLength(0);
        });

        it('sollte false zurückgeben, wenn der Eintrag nicht gefunden wird', async () => {
            const result = await historyManager.undoEntry('non-existent-id');
            expect(result).toBe(false);
        });
    });

    describe('getLastEntryForFile', () => {
        it('sollte den letzten Eintrag für eine Datei zurückgeben', () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            const lastEntry = historyManager.getLastEntryForFile('note.md');
            expect(lastEntry).toBeDefined();
            expect(lastEntry?.fileName).toBe('note.md');
        });

        it('sollte undefined zurückgeben, wenn kein Eintrag gefunden wird', () => {
            const lastEntry = historyManager.getLastEntryForFile('non-existent-file.md');
            expect(lastEntry).toBeUndefined();
        });
    });

    describe('undoLastMove', () => {
        it('sollte den letzten Verschiebevorgang erfolgreich rückgängig machen', async () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            const result = await historyManager.undoLastMove('note.md');
            expect(result).toBe(true);
            expect(historyManager.getHistory()).toHaveLength(0);
        });

        it('sollte false zurückgeben, wenn kein Eintrag gefunden wird', async () => {
            const result = await historyManager.undoLastMove('non-existent-file.md');
            expect(result).toBe(false);
        });
    });

    describe('clearHistory', () => {
        it('sollte den Verlauf löschen', async () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            await historyManager.clearHistory();
            expect(historyManager.getHistory()).toHaveLength(0);
        });
    });
}); 