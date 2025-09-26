import { FileMovementService } from '../FileMovementService';
import { TFile } from 'obsidian';
import { NoticeManager } from '../../utils/NoticeManager';
import {
  ensureFolderExists,
  getParentPath,
  combinePath,
} from '../../utils/PathUtils';

// Mock dependencies
jest.mock('../../utils/NoticeManager');
jest.mock('../../utils/PathUtils');
jest.mock('../../utils/Error');

const mockApp = {
  vault: {
    getAbstractFileByPath: jest.fn(),
    createFolder: jest.fn(),
  },
  fileManager: {
    renameFile: jest.fn(),
  },
} as any;

const mockPlugin = {
  historyManager: {
    addEntry: jest.fn(),
  },
} as any;

const mockFile = {
  path: 'source/test.md',
  name: 'test.md',
} as TFile;

describe('FileMovementService', () => {
  let fileMovementService: FileMovementService;

  beforeEach(() => {
    fileMovementService = new FileMovementService(mockApp, mockPlugin);
    jest.clearAllMocks();

    // Default mocks
    (ensureFolderExists as jest.Mock).mockResolvedValue(true);
    (getParentPath as jest.Mock).mockImplementation((path: string) => {
      const lastSlash = path.lastIndexOf('/');
      return lastSlash > 0 ? path.substring(0, lastSlash) : '';
    });
    (combinePath as jest.Mock).mockImplementation(
      (folder: string, file: string) => {
        if (!folder || folder === '/') return file;
        return `${folder}/${file}`;
      }
    );
    mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
    mockApp.fileManager.renameFile.mockResolvedValue(undefined);
  });

  describe('Plugin Move Tracking', () => {
    it('should track plugin move state correctly', () => {
      expect(fileMovementService.isInPluginMove()).toBe(false);

      fileMovementService.markPluginMoveStart();
      expect(fileMovementService.isInPluginMove()).toBe(true);

      fileMovementService.markPluginMoveEnd();
      expect(fileMovementService.isInPluginMove()).toBe(false);
    });
  });

  describe('validateFileExists', () => {
    it('should return file if it exists and is a TFile', () => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);

      const result = fileMovementService.validateFileExists('test/path.md');
      expect(result).toBe(mockFile);
    });

    it('should return null if file does not exist', () => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

      const result = fileMovementService.validateFileExists('nonexistent.md');
      expect(result).toBeNull();
    });

    it('should return null if file is not a TFile', () => {
      const mockFolder = { path: 'folder' };
      mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFolder);

      const result = fileMovementService.validateFileExists('folder');
      expect(result).toBeNull();
    });
  });

  describe('moveFile', () => {
    it('should successfully move file with default options', async () => {
      const result = await fileMovementService.moveFile(
        mockFile,
        'target/test.md'
      );

      expect(result).toBe(true);
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        'target/test.md'
      );
      expect(mockPlugin.historyManager.addEntry).toHaveBeenCalledWith({
        sourcePath: 'source/test.md',
        destinationPath: 'target/test.md',
        fileName: 'test.md',
      });
    });

    it('should move file without tracking in history when disabled', async () => {
      const result = await fileMovementService.moveFile(
        mockFile,
        'target/test.md',
        {
          trackInHistory: false,
        }
      );

      expect(result).toBe(true);
      expect(mockApp.fileManager.renameFile).toHaveBeenCalled();
      expect(mockPlugin.historyManager.addEntry).not.toHaveBeenCalled();
    });

    it('should show notifications when enabled', async () => {
      await fileMovementService.moveFile(mockFile, 'target/test.md', {
        showNotifications: true,
      });

      expect(NoticeManager.success).toHaveBeenCalledWith(
        'Moved test.md to target/test.md'
      );
    });

    it('should use custom original path when provided', async () => {
      await fileMovementService.moveFile(mockFile, 'target/test.md', {
        originalPath: 'custom/original.md',
      });

      expect(mockPlugin.historyManager.addEntry).toHaveBeenCalledWith({
        sourcePath: 'custom/original.md',
        destinationPath: 'target/test.md',
        fileName: 'test.md',
      });
    });

    it('should handle folder creation failure', async () => {
      (ensureFolderExists as jest.Mock).mockResolvedValue(false);
      (getParentPath as jest.Mock).mockReturnValue('target');

      const result = await fileMovementService.moveFile(
        mockFile,
        'target/test.md'
      );

      expect(result).toBe(false);
      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
      expect(ensureFolderExists).toHaveBeenCalledWith(mockApp, 'target');
    });

    it('should handle file rename failure', async () => {
      mockApp.fileManager.renameFile.mockRejectedValue(
        new Error('Rename failed')
      );

      const result = await fileMovementService.moveFile(
        mockFile,
        'target/test.md'
      );

      expect(result).toBe(false);
    });

    it('should always mark plugin move end even on errors', async () => {
      mockApp.fileManager.renameFile.mockRejectedValue(
        new Error('Rename failed')
      );

      await fileMovementService.moveFile(mockFile, 'target/test.md');

      expect(fileMovementService.isInPluginMove()).toBe(false);
    });
  });

  describe('moveFileToFolder', () => {
    it('should combine folder path with filename', async () => {
      (combinePath as jest.Mock).mockReturnValue('target/folder/test.md');
      (getParentPath as jest.Mock).mockReturnValue('target/folder');

      const result = await fileMovementService.moveFileToFolder(
        mockFile,
        'target/folder'
      );

      expect(result).toBe(true);
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        'target/folder/test.md'
      );
    });

    it('should handle root folder', async () => {
      (combinePath as jest.Mock).mockReturnValue('test.md');
      (getParentPath as jest.Mock).mockReturnValue('');

      await fileMovementService.moveFileToFolder(mockFile, '');

      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        'test.md'
      );
    });
  });

  describe('undoMove', () => {
    it('should successfully undo a move operation', async () => {
      const result = await fileMovementService.undoMove(
        'destination/test.md',
        'source/test.md',
        'test.md'
      );

      expect(result).toBe(true);
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        'source/test.md'
      );
    });

    it('should show notifications when enabled', async () => {
      await fileMovementService.undoMove(
        'destination/test.md',
        'source/test.md',
        'test.md',
        { showNotifications: true }
      );

      expect(NoticeManager.info).toHaveBeenCalledWith(
        'Attempting to move test.md from destination/test.md to source/test.md'
      );
      expect(NoticeManager.success).toHaveBeenCalledWith(
        'Successfully moved test.md back to source/test.md'
      );
    });

    it('should handle file not found at destination', async () => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

      const result = await fileMovementService.undoMove(
        'destination/test.md',
        'source/test.md',
        'test.md'
      );

      expect(result).toBe(false);
      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('should handle source folder creation failure', async () => {
      (ensureFolderExists as jest.Mock).mockResolvedValue(false);
      (getParentPath as jest.Mock).mockReturnValue('source');

      const result = await fileMovementService.undoMove(
        'destination/test.md',
        'source/test.md',
        'test.md'
      );

      expect(result).toBe(false);
      expect(mockApp.fileManager.renameFile).not.toHaveBeenCalled();
      expect(ensureFolderExists).toHaveBeenCalledWith(mockApp, 'source');
    });
  });

  describe('undoMoveFromHistoryEntry', () => {
    it('should undo move using history entry', async () => {
      const historyEntry = {
        id: '123',
        sourcePath: 'source/test.md',
        destinationPath: 'destination/test.md',
        fileName: 'test.md',
        timestamp: Date.now(),
      };

      const result =
        await fileMovementService.undoMoveFromHistoryEntry(historyEntry);

      expect(result).toBe(true);
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledWith(
        mockFile,
        'source/test.md'
      );
    });
  });

  describe('batchMoveFiles', () => {
    const operations = [
      { file: mockFile, targetPath: 'target1/test.md' },
      {
        file: {
          ...mockFile,
          name: 'test2.md',
          path: 'source/test2.md',
        } as TFile,
        targetPath: 'target2/test2.md',
      },
    ];

    it('should successfully batch move all files', async () => {
      const result = await fileMovementService.batchMoveFiles(operations);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockApp.fileManager.renameFile).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      mockApp.fileManager.renameFile
        .mockResolvedValueOnce(undefined) // First call succeeds
        .mockRejectedValueOnce(new Error('Failed')); // Second call fails

      const result = await fileMovementService.batchMoveFiles(operations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should call progress callback', async () => {
      const onProgress = jest.fn();

      await fileMovementService.batchMoveFiles(operations, { onProgress });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 0, 2, 'test.md');
      expect(onProgress).toHaveBeenNthCalledWith(2, 1, 2, 'test2.md');
    });

    it('should show batch notifications when enabled', async () => {
      await fileMovementService.batchMoveFiles(operations, {
        showNotifications: true,
      });

      expect(NoticeManager.success).toHaveBeenCalledWith(
        'Successfully moved 2 files!'
      );
    });

    it('should show warning for partial failures', async () => {
      mockApp.fileManager.renameFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed'));

      await fileMovementService.batchMoveFiles(operations, {
        showNotifications: true,
      });

      expect(NoticeManager.warning).toHaveBeenCalledWith(
        'Moved 1 files with 1 errors.'
      );
    });
  });
});
