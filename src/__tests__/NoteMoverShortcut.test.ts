import { NoteMoverShortcut } from '../core/NoteMoverShortcut';
import { App, TFile, getAllTags } from 'obsidian';
import NoteMoverShortcutPlugin from '../../main';
import { log_error, log_info } from '../utils/Log';
import { combinePath } from '../utils/PathUtils';

// Mocks für globale Funktionen
const setIntervalMock = jest.fn();
const clearIntervalMock = jest.fn();
global.window = Object.assign(global.window || {}, {
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock
});

describe('NoteMoverShortcut', () => {
    let plugin: NoteMoverShortcutPlugin;
    let noteMover: NoteMoverShortcut;
    let mockApp: App;
    let mockFile: TFile;

    beforeEach(() => {
        setIntervalMock.mockClear();
        clearIntervalMock.mockClear();
        (getAllTags as jest.Mock).mockReturnValue(['#test']);

        // Mock App
        mockApp = {
            vault: {
                adapter: {
                    exists: jest.fn()
                },
                getFiles: jest.fn().mockResolvedValue([]),
                createFolder: jest.fn()
            },
            fileManager: {
                renameFile: jest.fn()
            },
            workspace: {
                getActiveFile: jest.fn()
            },
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({ tags: [{ tag: '#test' }] })
            }
        } as unknown as App;

        // Mock File
        mockFile = {
            path: 'test/path/file.md',
            name: 'file.md'
        } as TFile;

        // Mock Plugin
        plugin = {
            app: mockApp,
            settings: {
                inboxLocation: 'inbox',
                destination: 'notes',
                enableRules: false,
                enablePeriodicMovement: false,
                periodicMovementInterval: 5,
                rules: [],
                filter: [],
                isFilterWhitelist: false
            },
            historyManager: {
                addEntry: jest.fn(),
                undoLastMove: jest.fn().mockResolvedValue(true),
                markPluginMoveStart: jest.fn(),
                markPluginMoveEnd: jest.fn()
            }
        } as unknown as NoteMoverShortcutPlugin;

        noteMover = new NoteMoverShortcut(plugin);
    });

    describe('setup', () => {
        it('should not start interval if periodic movement is disabled', () => {
            plugin.settings.enablePeriodicMovement = false;
            noteMover.setup();
            expect(window.setInterval).not.toHaveBeenCalled();
        });

        it('should start interval if periodic movement is enabled', () => {
            plugin.settings.enablePeriodicMovement = true;
            noteMover.setup();
            expect(window.setInterval).toHaveBeenCalled();
        });
    });

    describe('moveFocusedNoteToDestination', () => {
        it('should log error if no file is open', async () => {
            mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(null);
            await noteMover.moveFocusedNoteToDestination();
            expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
        });

        it('should move file to destination when file is open', async () => {
            mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
            await noteMover.moveFocusedNoteToDestination();
            expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
            expect(plugin.historyManager.addEntry).toHaveBeenCalled();
        });
    });

    describe('moveNotesFromInboxToNotesFolder', () => {
        it('should create folders if they do not exist', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(false);
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([]);
            await noteMover.moveNotesFromInboxToNotesFolder();
            expect(mockApp.vault.createFolder).toHaveBeenCalledTimes(2);
        });

        it('should move files from inbox to notes folder', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockFile.path = 'inbox/file.md';
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
            await noteMover.moveNotesFromInboxToNotesFolder();
            expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
        });
    });

    describe('togglePeriodicMovementInterval', () => {
        it('should clear existing interval', () => {
            const mockIntervalId = 123;
            noteMover['intervalId'] = mockIntervalId;
            noteMover.togglePeriodicMovementInterval();
            expect(window.clearInterval).toHaveBeenCalledWith(mockIntervalId);
        });

        it('should start new interval if periodic movement is enabled', () => {
            plugin.settings.enablePeriodicMovement = true;
            noteMover.togglePeriodicMovementInterval();
            expect(window.setInterval).toHaveBeenCalled();
        });
    });

    describe('moveFileBasedOnTags', () => {
        beforeEach(() => {
            plugin.settings.enableRules = true;
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }]
            });
        });

        it('should skip file if tag is in blacklist', async () => {
            plugin.settings.isFilterWhitelist = false;
            plugin.settings.filter = ['tag: #test'];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
        });

        it('should skip file if tag is not in whitelist', async () => {
            plugin.settings.isFilterWhitelist = true;
            plugin.settings.filter = ['tag: #other'];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
        });

        it('should move file to rule path if tag matches', async () => {
            plugin.settings.rules = [{ criteria: 'tag: #test', path: 'custom/path' }];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path/file.md')
            );
        });

        it('should move file to default path if no rules match', async () => {
            plugin.settings.rules = [{ criteria: 'tag: #other', path: 'custom/path' }];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                '/notes/file.md'
            );
        });

        it('should handle errors during file move', async () => {
            mockApp.fileManager.renameFile = jest.fn().mockRejectedValue(new Error('Move failed'));
            await expect(noteMover['moveFileBasedOnTags'](mockFile, 'default')).rejects.toThrow('Move failed');
        });

        it('should create target folder if it does not exist', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(false);
            plugin.settings.rules = [{ criteria: 'tag: #test', path: 'new/folder/path' }];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            
            expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith('new/folder/path');
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith('new/folder/path');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('new/folder/path/file.md')
            );
        });

        it('should not create target folder if it already exists', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            plugin.settings.rules = [{ criteria: 'tag: #test', path: 'existing/folder' }];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            
            expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith('existing/folder');
            expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('existing/folder/file.md')
            );
        });

        it('should not try to create root folder', async () => {
            plugin.settings.rules = [{ criteria: 'tag: #test', path: '/' }];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            
            expect(mockApp.vault.adapter.exists).not.toHaveBeenCalled();
            expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                'file.md'
            );
        });

        it('should not try to create empty folder', async () => {
            plugin.settings.rules = [{ criteria: 'tag: #test', path: '' }];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            
            expect(mockApp.vault.adapter.exists).not.toHaveBeenCalled();
            expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                '/file.md'
            );
        });
    });

    describe('generateInboxMovePreview', () => {
        it('should generate preview for inbox files', async () => {
            const mockPreview = { successfulMoves: [], blockedMoves: [], totalFiles: 0 };
            const mockRuleManager = {
                generateMovePreview: jest.fn().mockResolvedValue(mockPreview)
            };
            noteMover['ruleManager'] = mockRuleManager as any;
            
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
            
            const result = await noteMover.generateInboxMovePreview();
            
            expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith('inbox');
            expect(mockApp.vault.getFiles).toHaveBeenCalled();
            expect(mockRuleManager.generateMovePreview).toHaveBeenCalledWith(
                [],
                false,
                undefined,
                false
            );
            expect(result).toBe(mockPreview);
        });

        it('should create inbox folder if it does not exist', async () => {
            const mockPreview = { successfulMoves: [], blockedMoves: [], totalFiles: 0 };
            const mockRuleManager = {
                generateMovePreview: jest.fn().mockResolvedValue(mockPreview)
            };
            noteMover['ruleManager'] = mockRuleManager as any;
            
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(false);
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([]);
            
            await noteMover.generateInboxMovePreview();
            
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith('inbox');
        });

        it('should filter files to only include inbox files', async () => {
            const mockPreview = { successfulMoves: [], blockedMoves: [], totalFiles: 0 };
            const mockRuleManager = {
                generateMovePreview: jest.fn().mockResolvedValue(mockPreview)
            };
            noteMover['ruleManager'] = mockRuleManager as any;
            
            const inboxFile = { ...mockFile, path: 'inbox/file1.md' };
            const otherFile = { ...mockFile, path: 'other/file2.md' };
            
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([inboxFile, otherFile]);
            
            await noteMover.generateInboxMovePreview();
            
            expect(mockRuleManager.generateMovePreview).toHaveBeenCalledWith(
                [inboxFile],
                false,
                undefined,
                false
            );
        });
    });

    describe('generateActiveNotePreview', () => {
        it('should generate preview for active note', async () => {
            const mockPreview = { successfulMoves: [], blockedMoves: [], totalFiles: 0 };
            const mockRuleManager = {
                generateMovePreview: jest.fn().mockResolvedValue(mockPreview)
            };
            noteMover['ruleManager'] = mockRuleManager as any;
            
            mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
            
            const result = await noteMover.generateActiveNotePreview();
            
            expect(mockApp.workspace.getActiveFile).toHaveBeenCalled();
            expect(mockRuleManager.generateMovePreview).toHaveBeenCalledWith(
                [mockFile],
                false,
                undefined,
                false
            );
            expect(result).toBe(mockPreview);
        });

        it('should return null if no active file', async () => {
            mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(null);
            
            const result = await noteMover.generateActiveNotePreview();
            
            expect(result).toBeNull();
        });
    });

    describe('updateRuleManager', () => {
        it('should update rule manager when rules are enabled', () => {
            plugin.settings.enableRules = true;
            plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test' }];
            plugin.settings.filter = ['tag: #block'];
            plugin.settings.isFilterWhitelist = true;
            
            const mockRuleManager = {
                setRules: jest.fn(),
                setFilter: jest.fn()
            };
            noteMover['ruleManager'] = mockRuleManager as any;
            
            noteMover.updateRuleManager();
            
            expect(mockRuleManager.setRules).toHaveBeenCalledWith([{ criteria: 'tag: #test', path: 'test' }]);
            expect(mockRuleManager.setFilter).toHaveBeenCalledWith(['tag: #block'], true);
        });

        it('should not update rule manager when rules are disabled', () => {
            plugin.settings.enableRules = false;
            
            const mockRuleManager = {
                setRules: jest.fn(),
                setFilter: jest.fn()
            };
            noteMover['ruleManager'] = mockRuleManager as any;
            
            noteMover.updateRuleManager();
            
            expect(mockRuleManager.setRules).not.toHaveBeenCalled();
            expect(mockRuleManager.setFilter).not.toHaveBeenCalled();
        });
    });

    describe('moveFocusedNoteToDestination error handling', () => {
        it('should handle error in moveFocusedNoteToDestination', async () => {
            mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
            mockApp.fileManager.renameFile = jest.fn().mockRejectedValue(new Error('Move failed'));
            
            await noteMover.moveFocusedNoteToDestination();
            
            // Should not throw, but log error
            expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
        });
    });

    describe('moveNotesFromInboxToNotesFolder error handling', () => {
        it('should handle error when moving individual file', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockFile.path = 'inbox/file.md';
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
            mockApp.fileManager.renameFile = jest.fn().mockRejectedValue(new Error('Move failed'));
            
            await noteMover.moveNotesFromInboxToNotesFolder();
            
            // Should not throw, but log error and return early
            expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
        });
    });
}); 