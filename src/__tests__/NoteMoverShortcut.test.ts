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
                undoLastMove: jest.fn().mockResolvedValue(true)
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
            plugin.settings.rules = [{ tag: '#test', path: 'custom/path' }];
            plugin.settings.destination = 'notes';
            noteMover.updateRuleManager();
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path/file.md')
            );
        });

        it('should move file to default path if no rules match', async () => {
            plugin.settings.rules = [{ tag: '#other', path: 'custom/path' }];
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
    });
}); 