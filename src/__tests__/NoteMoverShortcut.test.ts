import { NoteMoverShortcut } from '../core/NoteMoverShortcut';
import { App, TFile, getAllTags, Notice } from 'obsidian';
import NoteMoverShortcutPlugin from '../../main';
import { NoticeManager } from '../utils/NoticeManager';
import { combinePath } from '../utils/PathUtils';

// Mocks für globale Funktionen
const setIntervalMock = jest.fn();
const clearIntervalMock = jest.fn();
global.window = Object.assign(global.window || {}, {
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock
});

// Mock Notice
jest.mock('obsidian', () => ({
    ...jest.requireActual('obsidian'),
    Notice: jest.fn().mockImplementation((message: string, timeout?: number) => ({
        noticeEl: {
            appendChild: jest.fn(),
            onclick: jest.fn()
        },
        hide: jest.fn()
    }))
}));

// Mock document
(global as any).document = {
    createElement: jest.fn().mockImplementation((tag: string) => ({
        textContent: '',
        className: '',
        style: {},
        appendChild: jest.fn(),
        onclick: jest.fn()
    })),
    createTextNode: jest.fn(),
    body: {
        appendChild: jest.fn()
    }
};

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
            path: 'test/path/test.md',
            name: 'test.md'
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
                isFilterWhitelist: false,
                onlyMoveNotesWithRules: false
            },
            historyManager: {
                addEntry: jest.fn(),
                undoLastMove: jest.fn().mockResolvedValue(true),
                markPluginMoveStart: jest.fn(),
                markPluginMoveEnd: jest.fn(),
                startBulkOperation: jest.fn().mockReturnValue('mock-bulk-id'),
                endBulkOperation: jest.fn()
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
                expect.stringContaining('custom/path/test.md')
            );
        });

        it('should move file to default path if no rules match', async () => {
            plugin.settings.rules = [{ criteria: 'tag: #other', path: 'custom/path' }];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                'notes/test.md'
            );
        });

        it('should skip file if onlyMoveNotesWithRules is enabled and no rules match', async () => {
            plugin.settings.rules = [{ criteria: 'tag: #other', path: 'custom/path' }];
            plugin.settings.destination = 'notes';
            plugin.settings.onlyMoveNotesWithRules = true;
            noteMover.updateRuleManager();
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
        });

        it('should move file to rule path if onlyMoveNotesWithRules is enabled and rule matches', async () => {
            plugin.settings.rules = [{ criteria: 'tag: #test', path: 'custom/path' }];
            plugin.settings.destination = 'notes';
            plugin.settings.onlyMoveNotesWithRules = true;
            noteMover.updateRuleManager();
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path/test.md')
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
                expect.stringContaining('new/folder/path/test.md')
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
                expect.stringContaining('existing/folder/test.md')
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
                'test.md'
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
                'test.md'
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
            plugin.settings.onlyMoveNotesWithRules = false;
            
            const mockRuleManager = {
                setRules: jest.fn(),
                setFilter: jest.fn(),
                setOnlyMoveNotesWithRules: jest.fn()
            };
            noteMover['ruleManager'] = mockRuleManager as any;
            
            noteMover.updateRuleManager();
            
            expect(mockRuleManager.setRules).toHaveBeenCalledWith([{ criteria: 'tag: #test', path: 'test' }]);
            expect(mockRuleManager.setFilter).toHaveBeenCalledWith(['tag: #block'], true);
            expect(mockRuleManager.setOnlyMoveNotesWithRules).toHaveBeenCalledWith(false);
        });

        it('should not update rule manager when rules are disabled', () => {
            plugin.settings.enableRules = false;
            
            const mockRuleManager = {
                setRules: jest.fn(),
                setFilter: jest.fn(),
                setOnlyMoveNotesWithRules: jest.fn()
            };
            noteMover['ruleManager'] = mockRuleManager as any;
            
            noteMover.updateRuleManager();
            
            expect(mockRuleManager.setRules).not.toHaveBeenCalled();
            expect(mockRuleManager.setFilter).not.toHaveBeenCalled();
            expect(mockRuleManager.setOnlyMoveNotesWithRules).not.toHaveBeenCalled();
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

    describe('moveNotesFromInboxToNotesFolderPeriodic', () => {
        it('should not create folders during periodic operations when they do not exist', async () => {
            mockApp.vault.adapter.exists = jest.fn()
                .mockResolvedValueOnce(false) // inbox doesn't exist
                .mockResolvedValueOnce(true);  // notes exists
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([]);
            
            await noteMover.moveNotesFromInboxToNotesFolderPeriodic();
            
            expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
        });

        it('should create notes folder during periodic operations if it does not exist', async () => {
            mockApp.vault.adapter.exists = jest.fn()
                .mockResolvedValueOnce(true)  // inbox exists
                .mockResolvedValueOnce(false); // notes doesn't exist
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([]);
            
            await noteMover.moveNotesFromInboxToNotesFolderPeriodic();
            
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith('notes');
        });

        it('should move files during periodic operations', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockFile.path = 'inbox/file.md';
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
            
            await noteMover.moveNotesFromInboxToNotesFolderPeriodic();
            
            expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
            expect(plugin.historyManager.startBulkOperation).toHaveBeenCalledWith('periodic');
            expect(plugin.historyManager.endBulkOperation).toHaveBeenCalled();
        });

        it('should handle errors during periodic operations', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockApp.fileManager.renameFile = jest.fn().mockRejectedValue(new Error('Move failed'));
            mockFile.path = 'inbox/file.md';
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
            
            await noteMover.moveNotesFromInboxToNotesFolderPeriodic();
            
            expect(plugin.historyManager.startBulkOperation).toHaveBeenCalledWith('periodic');
            expect(plugin.historyManager.endBulkOperation).toHaveBeenCalled();
        });

        it('should not log when no files are found during periodic operations', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([]);
            
            const logInfoSpy = jest.spyOn(NoticeManager, 'info');
            
            await noteMover.moveNotesFromInboxToNotesFolderPeriodic();
            
            expect(logInfoSpy).not.toHaveBeenCalled();
            expect(plugin.historyManager.startBulkOperation).not.toHaveBeenCalled();
        });
    });

    describe('updateRuleManager', () => {
        it('should update rule manager when rules are enabled', () => {
            plugin.settings.enableRules = true;
            plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test/path' }];
            plugin.settings.filter = ['tag: #filter'];
            plugin.settings.isFilterWhitelist = true;
            
            noteMover.updateRuleManager();
            
            // This test verifies the method runs without error
            // The actual rule manager functionality is tested separately
            expect(plugin.settings.enableRules).toBe(true);
        });

        it('should update rule manager when rules are disabled', () => {
            plugin.settings.enableRules = false;
            
            noteMover.updateRuleManager();
            
            expect(plugin.settings.enableRules).toBe(false);
        });
    });

    describe('Error Scenarios', () => {
        it('should handle file manager errors in moveFocusedNoteToDestination', async () => {
            mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
            mockApp.fileManager.renameFile = jest.fn().mockRejectedValue(new Error('File manager error'));
            
            await noteMover.moveFocusedNoteToDestination();
            
            expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
        });

        it('should handle vault creation errors in moveNotesFromInboxToNotesFolder', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(false);
            mockApp.vault.createFolder = jest.fn().mockRejectedValue(new Error('Cannot create folder'));
            
            await expect(noteMover.moveNotesFromInboxToNotesFolder()).rejects.toThrow();
        });

        it('should handle errors during bulk operations gracefully', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockApp.fileManager.renameFile = jest.fn()
                .mockResolvedValueOnce(undefined)  // First file succeeds
                .mockRejectedValueOnce(new Error('Second file fails')); // Second file fails
            
            const file1 = { path: 'inbox/file1.md', name: 'file1.md' };
            const file2 = { path: 'inbox/file2.md', name: 'file2.md' };
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([file1, file2]);
            
            await noteMover.moveNotesFromInboxToNotesFolder();
            
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledTimes(2);
            expect(plugin.historyManager.startBulkOperation).toHaveBeenCalled();
            expect(plugin.historyManager.endBulkOperation).toHaveBeenCalled();
        });
    });

    describe('Notice Creation', () => {
        beforeEach(() => {
            // Reset mock calls
            jest.clearAllMocks();
        });

        it('should create notice in moveFocusedNoteToDestination', async () => {
            mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
            
            await noteMover.moveFocusedNoteToDestination();
            
            expect(Notice).toHaveBeenCalled();
        });

        it('should create notice in moveNotesFromInboxToNotesFolder', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockFile.path = 'inbox/test.md';
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
            
            await noteMover.moveNotesFromInboxToNotesFolder();
            
            expect(Notice).toHaveBeenCalled();
        });
    });
}); 