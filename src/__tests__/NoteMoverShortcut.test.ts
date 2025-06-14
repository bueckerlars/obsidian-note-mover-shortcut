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
                    exists: jest.fn(),
                    stat: jest.fn().mockResolvedValue({
                        ctime: new Date('2024-01-01').getTime(),
                        mtime: new Date('2024-01-02').getTime(),
                        size: 100
                    })
                },
                getFiles: jest.fn().mockResolvedValue([]),
                createFolder: jest.fn(),
                read: jest.fn().mockResolvedValue('Test content')
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
            name: 'file.md',
            stat: {
                ctime: new Date('2024-01-01').getTime(),
                mtime: new Date('2024-01-02').getTime(),
                size: 100
            }
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

        it('should log error if moveFileBasedOnTags throws', async () => {
            mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
            noteMover['moveFileBasedOnTags'] = jest.fn().mockRejectedValue(new Error('fail'));
            await noteMover.moveFocusedNoteToDestination();
            expect(noteMover['moveFileBasedOnTags']).toHaveBeenCalled();
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

        it('should log and return if moving a file fails', async () => {
            mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
            mockFile.path = 'inbox/file.md';
            mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
            noteMover['moveFileBasedOnTags'] = jest.fn().mockRejectedValue(new Error('move fail'));
            await noteMover.moveNotesFromInboxToNotesFolder();
            expect(noteMover['moveFileBasedOnTags']).toHaveBeenCalled();
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
            mockFile.stat = {
                ctime: new Date('2024-01-01').getTime(),
                mtime: new Date('2024-01-02').getTime(),
                size: 100
            };
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
        });

        it('should move file to rule path if tag matches', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'rule',
                tag: '#test',
                path: 'custom/path'
            }];
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should move file to default path if no rules match', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'rule',
                tag: '#other',
                path: 'custom/path'
            }];
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should apply AND group rule when all child rules match', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [
                    {
                        id: '2',
                        tag: '#test',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Test content'
                            }
                        }
                    },
                    {
                        id: '3',
                        tag: '#tag1',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Test content'
                            }
                        }
                    }
                ]
            }];
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }, { tag: '#tag1' }]
            });
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should not apply AND group rule when not all child rules match', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [
                    {
                        id: '2',
                        tag: '#test',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Test content'
                            }
                        }
                    },
                    {
                        id: '3',
                        tag: '#tag1',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Other content'
                            }
                        }
                    }
                ]
            }];
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }]
            });
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should apply OR group rule when any child rule matches', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'or',
                destination: 'custom/path',
                triggers: [
                    {
                        id: '2',
                        tag: '#test',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Test content'
                            }
                        }
                    },
                    {
                        id: '3',
                        tag: '#tag1',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Other content'
                            }
                        }
                    }
                ]
            }];
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }]
            });
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should not apply OR group rule when no child rules match', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'or',
                destination: 'custom/path',
                triggers: [
                    {
                        id: '2',
                        tag: '#test',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Other content'
                            }
                        }
                    },
                    {
                        id: '3',
                        tag: '#tag1',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Other content'
                            }
                        }
                    }
                ]
            }];
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }]
            });
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should apply rule with date condition when date matches', async () => {
            plugin.settings.rules = [{
                id: 'test-id-1',
                type: 'rule',
                tag: '#test',
                path: 'custom/path',
                condition: {
                    dateCondition: {
                        type: 'created',
                        operator: 'olderThan',
                        days: 10
                    }
                }
            }];
            mockFile.stat = {
                ctime: new Date('2024-01-01').getTime(),
                mtime: new Date('2024-01-02').getTime(),
                size: 100
            };
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should not apply rule with date condition when date does not match', async () => {
            plugin.settings.rules = [{
                id: 'test-id-2',
                type: 'rule',
                tag: '#test',
                path: 'custom/path',
                condition: {
                    dateCondition: {
                        type: 'created',
                        operator: 'newerThan',
                        days: 10
                    }
                }
            }];
            mockFile.stat = {
                ctime: new Date('2024-01-01').getTime(),
                mtime: new Date('2024-01-02').getTime(),
                size: 100
            };
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should apply rule with content condition when content matches', async () => {
            plugin.settings.rules = [{
                id: 'test-id-3',
                type: 'rule',
                tag: '#test',
                path: 'custom/path',
                condition: {
                    contentCondition: {
                        operator: 'contains',
                        text: 'Test content'
                    }
                }
            }];
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should not apply rule with content condition when content does not match', async () => {
            plugin.settings.rules = [{
                id: 'test-id-4',
                type: 'rule',
                tag: '#test',
                path: 'custom/path',
                condition: {
                    contentCondition: {
                        operator: 'notContains',
                        text: 'Other content'
                    }
                }
            }];
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should apply rule with trigger when trigger matches', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [{
                    id: '2',
                    tag: '#test',
                    conditions: {
                        contentCondition: {
                            operator: 'contains',
                            text: 'Test content'
                        }
                    }
                }]
            }];
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should not apply rule with trigger when trigger does not match', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [{
                    id: '2',
                    tag: '#test',
                    conditions: {
                        contentCondition: {
                            operator: 'contains',
                            text: 'Other content'
                        }
                    }
                }]
            }];
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should apply group rule when any trigger matches (OR logic)', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'or',
                destination: 'custom/path',
                triggers: [
                    {
                        id: '2',
                        tag: '#test',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Test content'
                            }
                        }
                    },
                    {
                        id: '3',
                        tag: '#tag1',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Other content'
                            }
                        }
                    }
                ]
            }];
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }]
            });
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should not apply group rule when no trigger matches (OR logic)', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [
                    {
                        id: '2',
                        tag: '#test',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Other content'
                            }
                        }
                    },
                    {
                        id: '3',
                        tag: '#tag1',
                        conditions: {
                            contentCondition: {
                                operator: 'contains',
                                text: 'Other content'
                            }
                        }
                    }
                ]
            }];
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }]
            });
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should apply nested group rule if subgroup does not match, but main group does', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [{
                    id: '2',
                    tag: '#test',
                    conditions: {
                        contentCondition: {
                            operator: 'contains',
                            text: 'Test content'
                        }
                    }
                }],
                subgroups: [{
                    id: '3',
                    type: 'group',
                    groupType: 'and',
                    destination: 'nested/path',
                    triggers: [{
                        id: '4',
                        tag: '#nested',
                        conditions: {
                            dateCondition: {
                                type: 'created',
                                operator: 'olderThan',
                                days: 10
                            }
                        }
                    }]
                }]
            }];
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }, { tag: '#nested' }]
            });
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            mockApp.vault.adapter.stat = jest.fn().mockResolvedValue({
                ctime: new Date('2024-01-01').getTime(),
                mtime: new Date('2024-01-02').getTime(),
                size: 100
            });
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('nested/path')
            );
        });

        // Neue Tests für Rules-Funktionalität
        it('should apply rule with date condition when date matches', async () => {
            plugin.settings.rules = [{
                id: 'test-id-1',
                type: 'rule',
                tag: '#test',
                path: 'custom/path',
                condition: {
                    dateCondition: {
                        type: 'created',
                        operator: 'olderThan',
                        days: 10
                    }
                }
            }];
            mockApp.vault.adapter.stat = jest.fn().mockResolvedValue({
                ctime: new Date('2024-01-01').getTime(),
                mtime: new Date('2024-01-02').getTime(),
                size: 100
            });
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should not apply rule with date condition when date does not match', async () => {
            plugin.settings.rules = [{
                id: 'test-id-2',
                type: 'rule',
                tag: '#test',
                path: 'custom/path',
                condition: {
                    dateCondition: {
                        type: 'created',
                        operator: 'newerThan',
                        days: 10
                    }
                }
            }];
            mockFile.stat = {
                ctime: new Date('2024-01-01').getTime(),
                mtime: new Date('2024-01-02').getTime(),
                size: 100
            };
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should apply rule with content condition when content matches', async () => {
            plugin.settings.rules = [{
                id: 'test-id-3',
                type: 'rule',
                tag: '#test',
                path: 'custom/path',
                condition: {
                    contentCondition: {
                        operator: 'contains',
                        text: 'Test content'
                    }
                }
            }];
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should not apply rule with content condition when content does not match', async () => {
            plugin.settings.rules = [{
                id: 'test-id-4',
                type: 'rule',
                tag: '#test',
                path: 'custom/path',
                condition: {
                    contentCondition: {
                        operator: 'notContains',
                        text: 'Other content'
                    }
                }
            }];
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should apply group rule with multiple conditions', async () => {
            plugin.settings.rules = [{
                id: 'test-id-5',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [{
                    id: '2',
                    tag: '#test',
                    conditions: {
                        contentCondition: {
                            operator: 'contains',
                            text: 'Test content'
                        }
                    }
                }, {
                    id: '3',
                    tag: '#tag1',
                    conditions: {
                        contentCondition: {
                            operator: 'contains',
                            text: 'Other content'
                        }
                    }
                }]
            }];
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should handle missing file stats gracefully', async () => {
            plugin.settings.rules = [{
                id: 'test-id-6',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [{
                    id: '2',
                    tag: '#test',
                    conditions: {
                        contentCondition: {
                            operator: 'contains',
                            text: 'Test content'
                        }
                    }
                }]
            }];
            mockApp.vault.adapter.stat = jest.fn().mockResolvedValue(null);
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('custom/path')
            );
        });

        it('should handle file read errors gracefully', async () => {
            plugin.settings.rules = [{
                id: 'test-id-7',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [{
                    id: '2',
                    tag: '#test',
                    conditions: {
                        contentCondition: {
                            operator: 'contains',
                            text: 'Test content'
                        }
                    }
                }]
            }];
            mockApp.vault.read = jest.fn().mockRejectedValue(new Error('Read failed'));
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should apply nested group rule with complex conditions', async () => {
            plugin.settings.rules = [{
                id: 'test-id-8',
                type: 'group',
                groupType: 'and',
                destination: 'custom/path',
                triggers: [{
                    id: '2',
                    tag: '#test',
                    conditions: {
                        contentCondition: {
                            operator: 'contains',
                            text: 'Test content'
                        }
                    }
                }],
                subgroups: [{
                    id: '3',
                    type: 'group',
                    groupType: 'and',
                    destination: 'nested/path',
                    triggers: [{
                        id: '4',
                        tag: '#nested',
                        conditions: {
                            dateCondition: {
                                type: 'created',
                                operator: 'olderThan',
                                days: 10
                            }
                        }
                    }]
                }]
            }];
            mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
                tags: [{ tag: '#test' }, { tag: '#nested' }]
            });
            mockApp.vault.read = jest.fn().mockResolvedValue('Test content');
            mockApp.vault.adapter.stat = jest.fn().mockResolvedValue({
                ctime: new Date('2024-01-01').getTime(),
                mtime: new Date('2024-01-02').getTime(),
                size: 100
            });
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('nested/path')
            );
        });

        it('should fallback to default path if rules evaluation throws', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'rule',
                tag: '#test',
                path: 'custom/path'
            }];
            // rulesManager.evaluateRules wirft Fehler
            noteMover['rulesManager'].evaluateRules = jest.fn().mockRejectedValue(new Error('fail'));
            await noteMover['moveFileBasedOnTags'](mockFile, 'default');
            expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('default')
            );
        });

        it('should throw and log error if renameFile fails', async () => {
            plugin.settings.rules = [{
                id: '1',
                type: 'rule',
                tag: '#test',
                path: 'custom/path'
            }];
            (mockApp.fileManager.renameFile as jest.Mock).mockRejectedValue(new Error('move fail'));
            await expect(noteMover['moveFileBasedOnTags'](mockFile, 'default')).rejects.toThrow('move fail');
        });
    });
}); 