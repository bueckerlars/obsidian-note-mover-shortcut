import { HistoryManager } from '../HistoryManager';
import NoteMoverShortcutPlugin from 'main';
import { HistoryEntry } from '../../types/HistoryEntry';

let mockHistory: HistoryEntry[] = [];
let mockSettings: any;
let mockPlugin: any;

describe('HistoryManager', () => {
    let historyManager: HistoryManager;

    beforeEach(() => {
        mockHistory = [];
        mockSettings = { history: mockHistory };
        mockPlugin = {
            settings: mockSettings,
            save_settings: jest.fn().mockImplementation(() => {
                mockSettings.history = mockHistory;
                return Promise.resolve();
            }),
            app: {
                vault: {
                    getAbstractFileByPath: jest.fn().mockReturnValue({}),
                    adapter: {
                        exists: jest.fn().mockResolvedValue(true)
                    },
                    createFolder: jest.fn().mockResolvedValue(undefined)
                },
                fileManager: {
                    renameFile: jest.fn().mockResolvedValue(undefined),
                },
            },
        } as unknown as NoteMoverShortcutPlugin;
        historyManager = new HistoryManager(mockPlugin);
        historyManager.loadHistoryFromSettings();
        
        // Reset all mocks to default behavior before each test
        jest.clearAllMocks();
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

        it('should create source folder when undoing move from subfolder', async () => {
            // Mock that source folder doesn't exist initially
            mockPlugin.app.vault.adapter.exists.mockResolvedValueOnce(false);
            
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: 'subfolder/nested/note.md',
                destinationPath: 'notes/note.md',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            
            const result = await historyManager.undoLastMove('note.md');
            
            expect(result).toBe(true);
            expect(mockPlugin.app.vault.createFolder).toHaveBeenCalledWith('subfolder/nested');
            expect(mockPlugin.app.fileManager.renameFile).toHaveBeenCalled();
            expect(historyManager.getHistory()).toHaveLength(0);
        });

        it('should handle folder creation errors gracefully', async () => {
            // Mock that source folder doesn't exist and creation fails
            mockPlugin.app.vault.adapter.exists.mockResolvedValueOnce(false);
            mockPlugin.app.vault.createFolder.mockRejectedValueOnce(new Error('Folder creation failed'));
            
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: 'subfolder/nested/note.md',
                destinationPath: 'notes/note.md',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            
            const result = await historyManager.undoLastMove('note.md');
            
            expect(result).toBe(false);
            expect(mockPlugin.app.vault.createFolder).toHaveBeenCalledWith('subfolder/nested');
            expect(mockPlugin.app.fileManager.renameFile).not.toHaveBeenCalled();
            // Entry should still exist since undo failed
            expect(historyManager.getHistory()).toHaveLength(1);
        });

        it('should not try to create folder if source is in root', async () => {
            const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
                sourcePath: 'note.md',
                destinationPath: 'notes/note.md',
                fileName: 'note.md',
            };
            historyManager.addEntry(entry);
            
            const result = await historyManager.undoLastMove('note.md');
            
            expect(result).toBe(true);
            expect(mockPlugin.app.vault.createFolder).not.toHaveBeenCalled();
            expect(mockPlugin.app.fileManager.renameFile).toHaveBeenCalled();
            expect(historyManager.getHistory()).toHaveLength(0);
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

    describe('Plugin Move Tracking', () => {
        describe('markPluginMoveStart/End', () => {
            it('should mark and unmark plugin moves correctly', () => {
                historyManager.markPluginMoveStart();
                // Note: isPluginMove is private, so we test indirectly via addEntryFromVaultEvent
                historyManager.addEntryFromVaultEvent('/old/path', '/new/path', 'test.md');
                expect(historyManager.getHistory()).toHaveLength(0); // Should not add entry during plugin move
                
                historyManager.markPluginMoveEnd();
                historyManager.addEntryFromVaultEvent('/old/path2', '/new/path2', 'test2.md');
                expect(historyManager.getHistory()).toHaveLength(1); // Should add entry when not plugin move
            });
        });

        describe('addEntryFromVaultEvent', () => {
            it('should add entry for genuine file moves', () => {
                historyManager.addEntryFromVaultEvent(
                    '/folder1/test.md',
                    '/folder2/test.md',
                    'test.md'
                );
                expect(historyManager.getHistory()).toHaveLength(1);
                expect(historyManager.getHistory()[0].sourcePath).toBe('/folder1/test.md');
                expect(historyManager.getHistory()[0].destinationPath).toBe('/folder2/test.md');
            });

            it('should ignore file renames in same folder', () => {
                historyManager.addEntryFromVaultEvent(
                    '/folder/oldname.md',
                    '/folder/newname.md',
                    'newname.md'
                );
                expect(historyManager.getHistory()).toHaveLength(0); // Should not add for rename
            });

            it('should ignore duplicate entries within time window', () => {
                const now = Date.now();
                jest.spyOn(Date, 'now').mockReturnValue(now);
                
                // Add first entry
                historyManager.addEntryFromVaultEvent(
                    '/folder1/test.md',
                    '/folder2/test.md',
                    'test.md'
                );
                
                // Try to add same entry within time window
                jest.spyOn(Date, 'now').mockReturnValue(now + 500); // 500ms later
                historyManager.addEntryFromVaultEvent(
                    '/folder1/test.md',
                    '/folder2/test.md',
                    'test.md'
                );
                
                expect(historyManager.getHistory()).toHaveLength(1); // Should not add duplicate
                
                jest.restoreAllMocks();
            });

            it('should not add entry during plugin move', () => {
                historyManager.markPluginMoveStart();
                historyManager.addEntryFromVaultEvent(
                    '/folder1/test.md',
                    '/folder2/test.md',
                    'test.md'
                );
                expect(historyManager.getHistory()).toHaveLength(0);
            });
        });
    });
}); 