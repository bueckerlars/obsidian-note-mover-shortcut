import { NoteMoverShortcut } from '../core/NoteMoverShortcut';
import { App, TFile, getAllTags, Notice } from 'obsidian';
import NoteMoverShortcutPlugin from '../../main';
import { NoticeManager } from '../utils/NoticeManager';
import { combinePath } from '../utils/PathUtils';

// Mocks for global functions
const setIntervalMock = jest.fn();
const clearIntervalMock = jest.fn();
global.window = Object.assign(global.window || {}, {
  setInterval: setIntervalMock,
  clearInterval: clearIntervalMock,
});

// Mock Notice
jest.mock('obsidian', () => ({
  ...jest.requireActual('obsidian'),
  Notice: jest.fn().mockImplementation((message: string, timeout?: number) => ({
    noticeEl: {
      appendChild: jest.fn(),
      onclick: jest.fn(),
    },
    hide: jest.fn(),
  })),
}));

// Mock document
(global as any).document = {
  createElement: jest.fn().mockImplementation((tag: string) => ({
    textContent: '',
    className: '',
    style: {},
    appendChild: jest.fn(),
    onclick: jest.fn(),
  })),
  createTextNode: jest.fn(),
  body: {
    appendChild: jest.fn(),
  },
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
          exists: jest.fn(),
        },
        getFiles: jest.fn().mockResolvedValue([]),
        createFolder: jest.fn(),
      },
      fileManager: {
        renameFile: jest.fn(),
      },
      workspace: {
        getActiveFile: jest.fn(),
      },
      metadataCache: {
        getFileCache: jest.fn().mockReturnValue({ tags: [{ tag: '#test' }] }),
      },
    } as unknown as App;

    // Mock File
    mockFile = {
      path: 'test/path/test.md',
      name: 'test.md',
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
      },
      historyManager: {
        addEntry: jest.fn(),
        undoLastMove: jest.fn().mockResolvedValue(true),
        markPluginMoveStart: jest.fn(),
        markPluginMoveEnd: jest.fn(),
        startBulkOperation: jest.fn().mockReturnValue('mock-bulk-id'),
        endBulkOperation: jest.fn(),
      },
    } as unknown as NoteMoverShortcutPlugin;

    noteMover = new NoteMoverShortcut(plugin);
  });

  describe('setup', () => {
    it('should complete setup without errors', () => {
      plugin.settings.enablePeriodicMovement = false;
      expect(() => noteMover.setup()).not.toThrow();
    });
  });

  describe('moveFocusedNoteToDestination', () => {
    it('should log error if no file is open', async () => {
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(null);
      await noteMover.moveFocusedNoteToDestination();
      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('should move file to destination when file is open and rule matches', async () => {
      // Set up a rule that matches the mock file
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test-folder' }];
      noteMover.updateRuleManager();

      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
      await noteMover.moveFocusedNoteToDestination();
      expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
      expect(plugin.historyManager.addEntry).toHaveBeenCalled();
    });
  });

  describe('moveAllFilesInVault', () => {
    it('should move all files in vault that match rules', async () => {
      // Set up a rule that matches the mock file
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test-folder' }];
      noteMover.updateRuleManager();

      mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
      await noteMover.moveAllFilesInVault();
      expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
    });

    it('should handle empty vault', async () => {
      mockApp.vault.getFiles = jest.fn().mockResolvedValue([]);
      await noteMover.moveAllFilesInVault();
      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
    });
  });

  describe('moveFileBasedOnTags', () => {
    beforeEach(() => {
      // Rules are always enabled now
      mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({
        tags: [{ tag: '#test' }],
      });
    });

    it('should skip file if tag is in blacklist', async () => {
      plugin.settings.isFilterWhitelist = false;
      plugin.settings.filter = ['tag: #test'];
      // destination setting removed
      noteMover.updateRuleManager();
      await noteMover['moveFileBasedOnTags'](mockFile, 'default');
      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('should skip file if tag is not in whitelist', async () => {
      plugin.settings.isFilterWhitelist = true;
      plugin.settings.filter = ['tag: #other'];
      // destination setting removed
      noteMover.updateRuleManager();
      await noteMover['moveFileBasedOnTags'](mockFile, 'default');
      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('should move file to rule path if tag matches', async () => {
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'custom/path' }];
      // destination setting removed
      noteMover.updateRuleManager();
      await noteMover['moveFileBasedOnTags'](mockFile, 'default');
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('custom/path/test.md')
      );
    });

    it('should skip file if no rules match (only files with rules are moved)', async () => {
      plugin.settings.rules = [
        { criteria: 'tag: #other', path: 'custom/path' },
      ];
      noteMover.updateRuleManager();
      await noteMover['moveFileBasedOnTags'](mockFile, 'default');
      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('should move file to rule path when rule matches', async () => {
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'custom/path' }];
      noteMover.updateRuleManager();
      await noteMover['moveFileBasedOnTags'](mockFile, 'default');
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('custom/path/test.md')
      );
    });

    it('should handle errors during file move', async () => {
      // Set up a rule that matches the mock file
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test-folder' }];
      noteMover.updateRuleManager();

      mockApp.fileManager.renameFile = jest
        .fn()
        .mockRejectedValue(new Error('Move failed'));
      await expect(
        noteMover['moveFileBasedOnTags'](mockFile, 'default')
      ).rejects.toThrow('Move failed');
    });

    it('should create target folder if it does not exist', async () => {
      mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(false);
      plugin.settings.rules = [
        { criteria: 'tag: #test', path: 'new/folder/path' },
      ];
      // destination setting removed
      noteMover.updateRuleManager();

      await noteMover['moveFileBasedOnTags'](mockFile, 'default');

      expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith(
        'new/folder/path'
      );
      expect(mockApp.vault.createFolder).toHaveBeenCalledWith(
        'new/folder/path'
      );
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('new/folder/path/test.md')
      );
    });

    it('should not create target folder if it already exists', async () => {
      mockApp.vault.adapter.exists = jest.fn().mockResolvedValue(true);
      plugin.settings.rules = [
        { criteria: 'tag: #test', path: 'existing/folder' },
      ];
      // destination setting removed
      noteMover.updateRuleManager();

      await noteMover['moveFileBasedOnTags'](mockFile, 'default');

      expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith(
        'existing/folder'
      );
      expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('existing/folder/test.md')
      );
    });

    it('should not try to create root folder', async () => {
      plugin.settings.rules = [{ criteria: 'tag: #test', path: '/' }];
      // destination setting removed
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
      // destination setting removed
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

  describe('generateVaultMovePreview', () => {
    it('should generate preview for all vault files', async () => {
      const mockPreview = {
        successfulMoves: [],
        blockedMoves: [],
        totalFiles: 0,
      };
      const mockRuleManager = {
        generateMovePreview: jest.fn().mockResolvedValue(mockPreview),
      };
      noteMover['ruleManager'] = mockRuleManager as any;

      mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);

      const result = await noteMover.generateVaultMovePreview();

      expect(mockApp.vault.getFiles).toHaveBeenCalled();
      expect(mockRuleManager.generateMovePreview).toHaveBeenCalledWith(
        [mockFile],
        true, // Rules always enabled
        true, // Filter always enabled
        false // isFilterWhitelist
      );
      expect(result).toBe(mockPreview);
    });

    it('should process all files in vault', async () => {
      const mockPreview = {
        successfulMoves: [],
        blockedMoves: [],
        totalFiles: 0,
      };
      const mockRuleManager = {
        generateMovePreview: jest.fn().mockResolvedValue(mockPreview),
      };
      noteMover['ruleManager'] = mockRuleManager as any;

      const file1 = { ...mockFile, path: 'file1.md' };
      const file2 = { ...mockFile, path: 'folder/file2.md' };
      const file3 = { ...mockFile, path: 'other/file3.txt' };

      mockApp.vault.getFiles = jest
        .fn()
        .mockResolvedValue([file1, file2, file3]);

      await noteMover.generateVaultMovePreview();

      expect(mockRuleManager.generateMovePreview).toHaveBeenCalledWith(
        [file1, file2, file3],
        true, // Rules always enabled
        true, // Filter always enabled
        false // isFilterWhitelist
      );
    });
  });

  describe('generateActiveNotePreview', () => {
    it('should generate preview for active note', async () => {
      const mockPreview = {
        successfulMoves: [],
        blockedMoves: [],
        totalFiles: 0,
      };
      const mockRuleManager = {
        generateMovePreview: jest.fn().mockResolvedValue(mockPreview),
      };
      noteMover['ruleManager'] = mockRuleManager as any;

      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);

      const result = await noteMover.generateActiveNotePreview();

      expect(mockApp.workspace.getActiveFile).toHaveBeenCalled();
      expect(mockRuleManager.generateMovePreview).toHaveBeenCalledWith(
        [mockFile],
        true, // Rules are always enabled
        true, // Filter is always enabled
        false // isFilterWhitelist
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
      // Rules are always enabled now
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test' }];
      plugin.settings.filter = ['tag: #block'];
      plugin.settings.isFilterWhitelist = true;

      const mockRuleManager = {
        setRules: jest.fn(),
        setFilter: jest.fn(),
        setOnlyMoveNotesWithRules: jest.fn(),
      };
      noteMover['ruleManager'] = mockRuleManager as any;

      noteMover.updateRuleManager();

      expect(mockRuleManager.setRules).toHaveBeenCalledWith([
        { criteria: 'tag: #test', path: 'test' },
      ]);
      expect(mockRuleManager.setFilter).toHaveBeenCalledWith(
        ['tag: #block'],
        true
      );
    });

    it('should always update rule manager with current settings', () => {
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test/path' }];
      plugin.settings.filter = ['tag: #filter'];
      plugin.settings.isFilterWhitelist = true;

      const mockRuleManager = {
        setRules: jest.fn(),
        setFilter: jest.fn(),
        setOnlyMoveNotesWithRules: jest.fn(),
      };
      noteMover['ruleManager'] = mockRuleManager as any;

      noteMover.updateRuleManager();

      expect(mockRuleManager.setRules).toHaveBeenCalledWith(
        plugin.settings.rules
      );
      expect(mockRuleManager.setFilter).toHaveBeenCalledWith(
        plugin.settings.filter,
        plugin.settings.isFilterWhitelist
      );
    });
  });

  describe('moveFocusedNoteToDestination error handling', () => {
    it('should handle error in moveFocusedNoteToDestination', async () => {
      // Set up a rule that matches the mock file
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test-folder' }];
      noteMover.updateRuleManager();

      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
      mockApp.fileManager.renameFile = jest
        .fn()
        .mockRejectedValue(new Error('Move failed'));

      await noteMover.moveFocusedNoteToDestination();

      // Should not throw, but log error
      expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
    });
  });

  describe('moveAllFilesInVault error handling', () => {
    it('should handle error when moving individual file', async () => {
      // Set up a rule that matches the mock file
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test-folder' }];
      noteMover.updateRuleManager();

      mockFile.path = 'file.md';
      mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
      mockApp.fileManager.renameFile = jest
        .fn()
        .mockRejectedValue(new Error('Move failed'));

      await noteMover.moveAllFilesInVault();

      // Should not throw, but log error and return early
      expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
    });
  });

  describe('moveAllFilesInVaultPeriodic', () => {
    it('should move all files during periodic operations', async () => {
      // Set up a rule that matches the mock file
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test-folder' }];
      noteMover.updateRuleManager();

      mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);

      await noteMover.moveAllFilesInVaultPeriodic();

      expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
    });

    it('should handle empty vault during periodic operations', async () => {
      mockApp.vault.getFiles = jest.fn().mockResolvedValue([]);

      await noteMover.moveAllFilesInVaultPeriodic();

      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('should handle errors during periodic operations', async () => {
      mockFile.path = 'file.md';
      mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);
      mockApp.fileManager.renameFile = jest
        .fn()
        .mockRejectedValue(new Error('Move failed'));

      await noteMover.moveAllFilesInVaultPeriodic();

      expect(plugin.historyManager.startBulkOperation).toHaveBeenCalledWith(
        'periodic'
      );
      expect(plugin.historyManager.endBulkOperation).toHaveBeenCalled();
    });

    it('should not log when no files are found during periodic operations', async () => {
      mockApp.vault.getFiles = jest.fn().mockResolvedValue([]);

      const logInfoSpy = jest.spyOn(NoticeManager, 'info');

      await noteMover.moveAllFilesInVaultPeriodic();

      expect(logInfoSpy).not.toHaveBeenCalled();
      expect(plugin.historyManager.startBulkOperation).not.toHaveBeenCalled();
    });
  });

  describe('updateRuleManager', () => {
    it('should update rule manager with current settings', () => {
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test/path' }];
      plugin.settings.filter = ['tag: #filter'];
      plugin.settings.isFilterWhitelist = true;

      noteMover.updateRuleManager();

      // This test verifies the method runs without error
      // The actual rule manager functionality is tested separately
      expect(plugin.settings.rules).toHaveLength(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle file manager errors in moveFocusedNoteToDestination', async () => {
      // Set up a rule that matches the mock file
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test-folder' }];
      noteMover.updateRuleManager();

      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
      mockApp.fileManager.renameFile = jest
        .fn()
        .mockRejectedValue(new Error('File manager error'));

      await noteMover.moveFocusedNoteToDestination();

      expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
    });

    it('should handle errors during bulk operations gracefully', async () => {
      // Set up a rule that matches the mock files
      plugin.settings.rules = [{ criteria: 'tag: #test', path: 'test-folder' }];
      noteMover.updateRuleManager();

      mockApp.fileManager.renameFile = jest
        .fn()
        .mockResolvedValueOnce(undefined) // First file succeeds
        .mockRejectedValueOnce(new Error('Second file fails')); // Second file fails

      const file1 = { path: 'file1.md', name: 'file1.md' };
      const file2 = { path: 'file2.md', name: 'file2.md' };
      mockApp.vault.getFiles = jest.fn().mockResolvedValue([file1, file2]);

      await noteMover.moveAllFilesInVault();

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

    it('should create notice in moveAllFilesInVault', async () => {
      mockFile.path = 'test.md';
      mockApp.vault.getFiles = jest.fn().mockResolvedValue([mockFile]);

      await noteMover.moveAllFilesInVault();

      expect(Notice).toHaveBeenCalled();
    });
  });
});
