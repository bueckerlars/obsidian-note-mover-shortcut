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
        it('should add a new entry', () => {
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
        it('should return the complete history', () => {
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
        it('should successfully undo an entry', async () => {
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

        it('should return false if entry is not found', async () => {
            const result = await historyManager.undoEntry('non-existent-id');
            expect(result).toBe(false);
        });

        it('should return false if file is not found', async () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            (mockPlugin.app.vault.getAbstractFileByPath as jest.Mock).mockReturnValueOnce(null);
            const history = historyManager.getHistory();
            const result = await historyManager.undoEntry(history[0].id);
            expect(result).toBe(false);
        });

        it('should return false if renameFile throws', async () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            (mockPlugin.app.fileManager.renameFile as jest.Mock).mockRejectedValueOnce(new Error('fail'));
            const history = historyManager.getHistory();
            const result = await historyManager.undoEntry(history[0].id);
            expect(result).toBe(false);
        });
    });

    describe('getLastEntryForFile', () => {
        it('should return the last entry for a file', () => {
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

        it('should return undefined if no entry is found', () => {
            const lastEntry = historyManager.getLastEntryForFile('non-existent-file.md');
            expect(lastEntry).toBeUndefined();
        });
    });

    describe('undoLastMove', () => {
        it('should successfully undo the last move operation', async () => {
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

        it('should return false if no entry is found', async () => {
            const result = await historyManager.undoLastMove('non-existent-file.md');
            expect(result).toBe(false);
        });

        it('should return false if file is not found (undoLastMove)', async () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            (mockPlugin.app.vault.getAbstractFileByPath as jest.Mock).mockReturnValueOnce(null);
            const result = await historyManager.undoLastMove('note.md');
            expect(result).toBe(false);
        });

        it('should return false if renameFile throws (undoLastMove)', async () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: '/source/path',
                destinationPath: '/destination/path',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            (mockPlugin.app.fileManager.renameFile as jest.Mock).mockRejectedValueOnce(new Error('fail'));
            const result = await historyManager.undoLastMove('note.md');
            expect(result).toBe(false);
        });
    });

    describe('clearHistory', () => {
        it('should clear the history', async () => {
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