import { HistoryManager } from '../HistoryManager';
import NoteMoverShortcutPlugin from 'main';
import { HistoryEntry } from '../../types/HistoryEntry';

let mockHistory: HistoryEntry[] = [];
let mockSettings: any;
let mockPlugin: any;
let mockFile: any;

describe('HistoryManager', () => {
  let historyManager: HistoryManager;

  beforeEach(() => {
    mockHistory = [];
    mockSettings = { history: { history: mockHistory, bulkOperations: [] } };
    mockFile = {
      path: 'test/path.md',
      name: 'test.md',
    };
    mockPlugin = {
      settings: mockSettings,
      save_settings: jest.fn().mockImplementation(() => {
        mockSettings.history.history = mockHistory;
        return Promise.resolve();
      }),
      app: {
        vault: {
          getAbstractFileByPath: jest.fn().mockReturnValue({}),
          adapter: {
            exists: jest.fn().mockResolvedValue(true),
          },
          createFolder: jest.fn().mockResolvedValue(undefined),
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
      const lastEntry = historyManager.getLastEntryForFile(
        'non-existent-file.md'
      );
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
      expect(mockPlugin.app.vault.createFolder).toHaveBeenCalledWith(
        'subfolder/nested'
      );
      expect(mockPlugin.app.fileManager.renameFile).toHaveBeenCalled();
      expect(historyManager.getHistory()).toHaveLength(0);
    });

    it('should handle folder creation errors gracefully', async () => {
      // Mock that source folder doesn't exist and creation fails
      mockPlugin.app.vault.adapter.exists.mockResolvedValueOnce(false);
      mockPlugin.app.vault.createFolder.mockRejectedValueOnce(
        new Error('Folder creation failed')
      );

      const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
        sourcePath: 'subfolder/nested/note.md',
        destinationPath: 'notes/note.md',
        fileName: 'note.md',
      };
      historyManager.addEntry(entry);

      const result = await historyManager.undoLastMove('note.md');

      expect(result).toBe(false);
      expect(mockPlugin.app.vault.createFolder).toHaveBeenCalledWith(
        'subfolder/nested'
      );
      expect(mockPlugin.app.fileManager.renameFile).not.toHaveBeenCalled();
      // Entry should still exist since undo failed
      expect(historyManager.getHistory()).toHaveLength(1);
    });

    it('should handle file rename errors during undoLastMove', async () => {
      mockPlugin.app.fileManager.renameFile.mockRejectedValue(
        new Error('File rename failed')
      );

      const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
        sourcePath: 'source/note.md',
        destinationPath: 'destination/note.md',
        fileName: 'note.md',
      };
      historyManager.addEntry(entry);

      const result = await historyManager.undoLastMove('note.md');

      expect(result).toBe(false);
      expect(mockPlugin.app.fileManager.renameFile).toHaveBeenCalled();
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
        historyManager.addEntryFromVaultEvent(
          '/old/path',
          '/new/path',
          'test.md'
        );
        expect(historyManager.getHistory()).toHaveLength(0); // Should not add entry during plugin move

        historyManager.markPluginMoveEnd();
        historyManager.addEntryFromVaultEvent(
          '/old/path2',
          '/new/path2',
          'test2.md'
        );
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
        expect(historyManager.getHistory()[0].sourcePath).toBe(
          '/folder1/test.md'
        );
        expect(historyManager.getHistory()[0].destinationPath).toBe(
          '/folder2/test.md'
        );
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

  describe('Bulk Operations', () => {
    describe('startBulkOperation', () => {
      it('should start a bulk operation and return ID', () => {
        const bulkId = historyManager.startBulkOperation('bulk');
        expect(bulkId).toBeDefined();
        expect(typeof bulkId).toBe('string');

        const bulkOps = historyManager.getBulkOperations();
        expect(bulkOps).toHaveLength(1);
        expect(bulkOps[0].id).toBe(bulkId);
        expect(bulkOps[0].operationType).toBe('bulk');
        expect(bulkOps[0].entries).toEqual([]);
        expect(bulkOps[0].totalFiles).toBe(0);
      });

      it('should start a periodic operation', () => {
        const bulkId = historyManager.startBulkOperation('periodic');
        const bulkOps = historyManager.getBulkOperations();
        expect(bulkOps[0].operationType).toBe('periodic');
      });

      it('should limit bulk operations to MAX_BULK_OPERATIONS', () => {
        // Start more than MAX_BULK_OPERATIONS (20) and add entries to prevent removal
        for (let i = 0; i < 25; i++) {
          historyManager.startBulkOperation('bulk');
          // Add an entry to prevent the bulk operation from being removed when ended
          historyManager.addEntry({
            sourcePath: `/source/path${i}`,
            destinationPath: `/destination/path${i}`,
            fileName: `note${i}.md`,
          });
          historyManager.endBulkOperation();
        }

        expect(historyManager.getBulkOperations()).toHaveLength(20);
      });
    });

    describe('endBulkOperation', () => {
      it('should end current bulk operation', () => {
        const bulkId = historyManager.startBulkOperation('bulk');

        // Add an entry so the bulk operation won't be removed when ended
        historyManager.addEntry({
          sourcePath: '/source/path',
          destinationPath: '/destination/path',
          fileName: 'note.md',
        });

        historyManager.endBulkOperation();

        // Should still exist since it has entries
        expect(historyManager.getBulkOperations()).toHaveLength(1);
      });

      it('should remove empty bulk operations when ended', () => {
        const bulkId = historyManager.startBulkOperation('bulk');
        historyManager.endBulkOperation();

        // Should be removed since it has no entries
        expect(historyManager.getBulkOperations()).toHaveLength(0);
      });

      it('should handle ending when no bulk operation is active', () => {
        // Should not throw
        expect(() => historyManager.endBulkOperation()).not.toThrow();
      });
    });

    describe('addEntry with bulk operations', () => {
      it('should add entries to current bulk operation', () => {
        const bulkId = historyManager.startBulkOperation('bulk');

        const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path',
          destinationPath: '/destination/path',
          fileName: 'note.md',
        };

        historyManager.addEntry(entry);

        const bulkOps = historyManager.getBulkOperations();
        expect(bulkOps[0].entries).toHaveLength(1);
        expect(bulkOps[0].totalFiles).toBe(1);
        expect(bulkOps[0].entries[0].bulkOperationId).toBe(bulkId);
        expect(bulkOps[0].entries[0].operationType).toBe('bulk');

        historyManager.endBulkOperation();
      });

      it('should add entries without bulk operation when none is active', () => {
        const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path',
          destinationPath: '/destination/path',
          fileName: 'note.md',
        };

        historyManager.addEntry(entry);

        const history = historyManager.getHistory();
        expect(history[0].bulkOperationId).toBeUndefined();
        expect(history[0].operationType).toBe('single');
      });
    });

    describe('undoBulkOperation', () => {
      beforeEach(() => {
        // Reset mocks for each test
        mockPlugin.app.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockPlugin.app.vault.adapter.exists.mockResolvedValue(true);
        mockPlugin.app.fileManager.renameFile.mockResolvedValue(undefined);
      });

      it('should return false for non-existent bulk operation', async () => {
        const result =
          await historyManager.undoBulkOperation('non-existent-id');
        expect(result).toBe(false);
      });

      it('should successfully undo a bulk operation', async () => {
        const bulkId = historyManager.startBulkOperation('bulk');

        // Add some entries to the bulk operation
        const entry1: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path1',
          destinationPath: '/destination/path1',
          fileName: 'note1.md',
        };
        const entry2: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path2',
          destinationPath: '/destination/path2',
          fileName: 'note2.md',
        };

        historyManager.addEntry(entry1);
        historyManager.addEntry(entry2);
        historyManager.endBulkOperation();

        const result = await historyManager.undoBulkOperation(bulkId);

        expect(result).toBe(true);
        expect(mockPlugin.app.fileManager.renameFile).toHaveBeenCalledTimes(2);
        expect(historyManager.getBulkOperations()).toHaveLength(0);
        expect(historyManager.getHistory()).toHaveLength(0);
      });

      it('should handle partial undo failures gracefully', async () => {
        const bulkId = historyManager.startBulkOperation('bulk');

        const entry1: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path1',
          destinationPath: '/destination/path1',
          fileName: 'note1.md',
        };
        const entry2: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path2',
          destinationPath: '/destination/path2',
          fileName: 'note2.md',
        };

        historyManager.addEntry(entry1);
        historyManager.addEntry(entry2);
        historyManager.endBulkOperation();

        // Mock first file not found, second successful
        mockPlugin.app.vault.getAbstractFileByPath
          .mockReturnValueOnce(null) // First call returns null (file not found)
          .mockReturnValueOnce(mockFile); // Second call returns file

        const result = await historyManager.undoBulkOperation(bulkId);

        expect(result).toBe(false); // Should return false since not all succeeded
        expect(mockPlugin.app.fileManager.renameFile).toHaveBeenCalledTimes(1);

        // Should have one remaining entry in bulk operation
        const bulkOps = historyManager.getBulkOperations();
        expect(bulkOps).toHaveLength(1);
        expect(bulkOps[0].entries).toHaveLength(1);
      });

      it('should create source folders when needed during bulk undo', async () => {
        const bulkId = historyManager.startBulkOperation('bulk');

        const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: 'subfolder/nested/note.md',
          destinationPath: '/destination/note.md',
          fileName: 'note.md',
        };

        historyManager.addEntry(entry);
        historyManager.endBulkOperation();

        // Mock that source folder doesn't exist initially
        mockPlugin.app.vault.adapter.exists
          .mockResolvedValueOnce(false) // First check for folder existence
          .mockResolvedValueOnce(true); // After folder creation

        const result = await historyManager.undoBulkOperation(bulkId);

        expect(result).toBe(true);
        expect(mockPlugin.app.vault.createFolder).toHaveBeenCalledWith(
          'subfolder/nested'
        );
        expect(mockPlugin.app.fileManager.renameFile).toHaveBeenCalled();
      });
    });

    describe('undoEntry with bulk operations', () => {
      it('should remove entry from bulk operation when undoing individual entry', async () => {
        const bulkId = historyManager.startBulkOperation('bulk');

        const entry1: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path1',
          destinationPath: '/destination/path1',
          fileName: 'note1.md',
        };
        const entry2: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path2',
          destinationPath: '/destination/path2',
          fileName: 'note2.md',
        };

        historyManager.addEntry(entry1);
        historyManager.addEntry(entry2);
        historyManager.endBulkOperation();

        const history = historyManager.getHistory();
        const result = await historyManager.undoEntry(history[0].id);

        expect(result).toBe(true);
        expect(historyManager.getHistory()).toHaveLength(1);

        // Check that bulk operation still exists with one entry
        const bulkOps = historyManager.getBulkOperations();
        expect(bulkOps).toHaveLength(1);
        expect(bulkOps[0].entries).toHaveLength(1);
        expect(bulkOps[0].totalFiles).toBe(1);
      });

      it('should remove bulk operation when last entry is undone', async () => {
        const bulkId = historyManager.startBulkOperation('bulk');

        const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
          sourcePath: '/source/path',
          destinationPath: '/destination/path',
          fileName: 'note.md',
        };

        historyManager.addEntry(entry);
        historyManager.endBulkOperation();

        const history = historyManager.getHistory();
        const result = await historyManager.undoEntry(history[0].id);

        expect(result).toBe(true);
        expect(historyManager.getHistory()).toHaveLength(0);
        expect(historyManager.getBulkOperations()).toHaveLength(0);
      });
    });
  });

  describe('loadHistoryFromSettings', () => {
    it('should load history from settings when valid array exists', () => {
      const mockHistoryEntry: HistoryEntry = {
        id: 'test-id',
        sourcePath: '/source',
        destinationPath: '/dest',
        fileName: 'test.md',
        timestamp: 123456789,
        operationType: 'single',
      };

      mockPlugin.settings.history = {
        history: [mockHistoryEntry],
        bulkOperations: [],
      } as any;
      historyManager.loadHistoryFromSettings();

      const history = historyManager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(mockHistoryEntry);
    });

    it('should initialize empty history when settings.history is not an array', () => {
      mockPlugin.settings.history = null as any;
      historyManager.loadHistoryFromSettings();

      const history = historyManager.getHistory();
      expect(history).toEqual([]);
    });

    it('should load bulk operations from settings when valid array exists', () => {
      const mockBulkOp = {
        id: 'bulk-id',
        operationType: 'bulk' as const,
        timestamp: 123456789,
        entries: [],
        totalFiles: 0,
      };

      mockPlugin.settings.history = {
        history: [],
        bulkOperations: [mockBulkOp],
      } as any;
      historyManager.loadHistoryFromSettings();

      const bulkOps = historyManager.getBulkOperations();
      expect(bulkOps).toHaveLength(1);
      expect(bulkOps[0]).toEqual(mockBulkOp);
    });

    it('should initialize empty bulk operations when settings.bulkOperations is not an array', () => {
      mockPlugin.settings.history = {
        history: [],
        bulkOperations: null,
      } as any;
      historyManager.loadHistoryFromSettings();

      const bulkOps = historyManager.getBulkOperations();
      expect(bulkOps).toEqual([]);
    });
  });

  describe('getFilteredHistory', () => {
    beforeEach(() => {
      // Add some test entries with different timestamps
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      // Use 3 days ago instead of 7 days to ensure it's within current month
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

      // Mock Date.now for consistent testing
      jest.spyOn(Date, 'now').mockReturnValue(now);

      historyManager.addEntry({
        sourcePath: '/source/path1',
        destinationPath: '/destination/path1',
        fileName: 'note1.md',
      });

      // Add entry from yesterday
      jest.spyOn(Date, 'now').mockReturnValue(oneDayAgo);
      historyManager.addEntry({
        sourcePath: '/source/path2',
        destinationPath: '/destination/path2',
        fileName: 'note2.md',
      });

      // Add entry from 3 days ago
      jest.spyOn(Date, 'now').mockReturnValue(threeDaysAgo);
      historyManager.addEntry({
        sourcePath: '/source/path3',
        destinationPath: '/destination/path3',
        fileName: 'note3.md',
      });

      // Add entry from last month
      jest.spyOn(Date, 'now').mockReturnValue(oneMonthAgo);
      historyManager.addEntry({
        sourcePath: '/source/path4',
        destinationPath: '/destination/path4',
        fileName: 'note4.md',
      });

      // Reset to current time
      jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return all entries when timeFilter is "all"', () => {
      const filtered = historyManager.getFilteredHistory('all');
      expect(filtered).toHaveLength(4);
    });

    it('should return only today entries when timeFilter is "today"', () => {
      const filtered = historyManager.getFilteredHistory('today');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].fileName).toBe('note1.md');
    });

    it('should return only this week entries when timeFilter is "week"', () => {
      const filtered = historyManager.getFilteredHistory('week');
      expect(filtered).toHaveLength(3); // today + yesterday + 3 days ago (all within this week)
    });

    it('should return only this month entries when timeFilter is "month"', () => {
      const filtered = historyManager.getFilteredHistory('month');
      expect(filtered).toHaveLength(3); // today + yesterday + 3 days ago (all within this month)
    });

    it('should handle invalid timeFilter by returning all entries', () => {
      const filtered = historyManager.getFilteredHistory('invalid' as any);
      expect(filtered).toHaveLength(4);
    });
  });

  describe('getFilteredBulkOperations', () => {
    beforeEach(() => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      // Use 3 days ago instead of 7 days to ensure it's within current month
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

      // Mock Date.now for consistent testing
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // Add bulk operations with different timestamps
      historyManager.startBulkOperation('bulk');
      historyManager.addEntry({
        sourcePath: '/source/path1',
        destinationPath: '/destination/path1',
        fileName: 'note1.md',
      });
      historyManager.endBulkOperation();

      // Add bulk operation from yesterday
      jest.spyOn(Date, 'now').mockReturnValue(oneDayAgo);
      historyManager.startBulkOperation('bulk');
      historyManager.addEntry({
        sourcePath: '/source/path2',
        destinationPath: '/destination/path2',
        fileName: 'note2.md',
      });
      historyManager.endBulkOperation();

      // Add bulk operation from 3 days ago
      jest.spyOn(Date, 'now').mockReturnValue(threeDaysAgo);
      historyManager.startBulkOperation('bulk');
      historyManager.addEntry({
        sourcePath: '/source/path3',
        destinationPath: '/destination/path3',
        fileName: 'note3.md',
      });
      historyManager.endBulkOperation();

      // Reset to current time
      jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return all bulk operations when timeFilter is "all"', () => {
      const filtered = historyManager.getFilteredBulkOperations('all');
      expect(filtered).toHaveLength(3);
    });

    it('should return only today bulk operations when timeFilter is "today"', () => {
      const filtered = historyManager.getFilteredBulkOperations('today');
      expect(filtered).toHaveLength(1);
    });

    it('should return only this week bulk operations when timeFilter is "week"', () => {
      const filtered = historyManager.getFilteredBulkOperations('week');
      expect(filtered).toHaveLength(3); // today + yesterday + 3 days ago (all within this week)
    });

    it('should return only this month bulk operations when timeFilter is "month"', () => {
      const filtered = historyManager.getFilteredBulkOperations('month');
      expect(filtered).toHaveLength(3); // today + yesterday + 3 days ago (all within this month)
    });
  });

  describe('getBulkOperations', () => {
    it('should return all bulk operations', () => {
      historyManager.startBulkOperation('bulk');
      historyManager.addEntry({
        sourcePath: '/source/path',
        destinationPath: '/destination/path',
        fileName: 'note.md',
      });
      historyManager.endBulkOperation();

      const bulkOps = historyManager.getBulkOperations();
      expect(bulkOps).toHaveLength(1);
      expect(bulkOps[0].operationType).toBe('bulk');
    });
  });

  describe('addEntry with bulk operations', () => {
    it('should add entry to current bulk operation when one is active', () => {
      const bulkId = historyManager.startBulkOperation('bulk');

      const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
        sourcePath: '/source/path',
        destinationPath: '/destination/path',
        fileName: 'note.md',
      };

      historyManager.addEntry(entry);

      const bulkOps = historyManager.getBulkOperations();
      expect(bulkOps[0].entries).toHaveLength(1);
      expect(bulkOps[0].totalFiles).toBe(1);
      expect(bulkOps[0].entries[0].bulkOperationId).toBe(bulkId);
    });

    it('should not add entry to bulk operation when none is active', () => {
      const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
        sourcePath: '/source/path',
        destinationPath: '/destination/path',
        fileName: 'note.md',
      };

      historyManager.addEntry(entry);

      const history = historyManager.getHistory();
      expect(history[0].bulkOperationId).toBeUndefined();
      expect(history[0].operationType).toBe('single');
    });
  });

  describe('History limit management', () => {
    it('should limit history to MAX_HISTORY_ENTRIES', () => {
      // Add more entries than the limit
      for (let i = 0; i < 150; i++) {
        historyManager.addEntry({
          sourcePath: `/source/path${i}`,
          destinationPath: `/destination/path${i}`,
          fileName: `note${i}.md`,
        });
      }

      const history = historyManager.getHistory();
      expect(history.length).toBeLessThanOrEqual(100); // Assuming MAX_HISTORY_ENTRIES is 100
    });
  });

  describe('Error Handling', () => {
    it('should handle file manager errors during undo', async () => {
      mockPlugin.app.fileManager.renameFile.mockRejectedValue(
        new Error('File manager error')
      );

      const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
        sourcePath: '/source/path',
        destinationPath: '/destination/path',
        fileName: 'note.md',
      };
      historyManager.addEntry(entry);

      const history = historyManager.getHistory();
      const result = await historyManager.undoEntry(history[0].id);

      expect(result).toBe(false);
      expect(historyManager.getHistory()).toHaveLength(1); // Entry should remain
    });

    it('should handle missing files during undo gracefully', async () => {
      mockPlugin.app.vault.getAbstractFileByPath.mockReturnValue(null);

      const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
        sourcePath: '/source/path',
        destinationPath: '/destination/path',
        fileName: 'note.md',
      };
      historyManager.addEntry(entry);

      const history = historyManager.getHistory();
      const result = await historyManager.undoEntry(history[0].id);

      expect(result).toBe(false);
    });

    it('should handle folder creation errors during undo', async () => {
      mockPlugin.app.vault.adapter.exists.mockResolvedValue(false);
      mockPlugin.app.vault.createFolder.mockRejectedValue(
        new Error('Cannot create folder')
      );

      const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
        sourcePath: 'subfolder/nested/note.md',
        destinationPath: '/destination/note.md',
        fileName: 'note.md',
      };
      historyManager.addEntry(entry);

      const history = historyManager.getHistory();
      const result = await historyManager.undoEntry(history[0].id);

      expect(result).toBe(false);
      expect(mockPlugin.app.vault.createFolder).toHaveBeenCalled();
      expect(mockPlugin.app.fileManager.renameFile).not.toHaveBeenCalled();
    });
  });
});
