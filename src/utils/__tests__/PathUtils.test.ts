import { formatPath, combinePath, getParentPath, ensureFolderExists } from '../PathUtils';

// Mock Obsidian App
const mockApp = {
    vault: {
        adapter: {
            exists: jest.fn()
        },
        createFolder: jest.fn()
    }
} as any;

describe('PathUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('formatPath', () => {
        it('should remove double slashes and leading slash', () => {
            expect(formatPath('//test///path//')).toBe('test/path');
        });

        it('should remove leading slash to make paths relative', () => {
            expect(formatPath('/test/path')).toBe('test/path');
        });

        it('should remove trailing slash', () => {
            expect(formatPath('/test/path/')).toBe('test/path');
        });

        it('should handle root path correctly', () => {
            expect(formatPath('/')).toBe('');
            expect(formatPath('')).toBe('');
        });

        it('should handle paths without leading slash', () => {
            expect(formatPath('test/path')).toBe('test/path');
        });

        it('should handle single folder', () => {
            expect(formatPath('folder')).toBe('folder');
            expect(formatPath('/folder/')).toBe('folder');
        });
    });

    describe('combinePath', () => {
        it('should correctly combine folder path and filename', () => {
            expect(combinePath('test/folder', 'file.md')).toBe('test/folder/file.md');
        });

        it('should handle paths with leading slash', () => {
            expect(combinePath('/test/folder', 'file.md')).toBe('test/folder/file.md');
        });

        it('should handle root path correctly', () => {
            expect(combinePath('/', 'file.md')).toBe('file.md');
            expect(combinePath('', 'file.md')).toBe('file.md');
        });

        it('should avoid double slashes', () => {
            expect(combinePath('/test//folder/', 'file.md')).toBe('test/folder/file.md');
        });

        it('should handle empty folder', () => {
            expect(combinePath('', 'file.md')).toBe('file.md');
        });
    });

    describe('getParentPath', () => {
        it('should extract parent path from full path', () => {
            expect(getParentPath('folder/subfolder/file.md')).toBe('folder/subfolder');
        });

        it('should handle single folder level', () => {
            expect(getParentPath('folder/file.md')).toBe('folder');
        });

        it('should handle file in root directory', () => {
            expect(getParentPath('file.md')).toBe('');
        });

        it('should handle empty path', () => {
            expect(getParentPath('')).toBe('');
        });

        it('should handle path with no filename', () => {
            expect(getParentPath('folder/subfolder/')).toBe('folder/subfolder');
        });

        it('should handle deeply nested paths', () => {
            expect(getParentPath('a/b/c/d/e/file.md')).toBe('a/b/c/d/e');
        });

        it('should handle paths with special characters', () => {
            expect(getParentPath('my folder/sub-folder/file name.md')).toBe('my folder/sub-folder');
        });
    });

    describe('ensureFolderExists', () => {
        it('should return true if folder already exists', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(true);
            
            const result = await ensureFolderExists(mockApp, 'existing/folder');
            
            expect(result).toBe(true);
            expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith('existing/folder');
            expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
        });

        it('should create folder if it does not exist', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(false);
            mockApp.vault.createFolder.mockResolvedValue(undefined);
            
            const result = await ensureFolderExists(mockApp, 'new/folder');
            
            expect(result).toBe(true);
            expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith('new/folder');
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith('new/folder');
        });

        it('should return false if folder creation fails', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(false);
            mockApp.vault.createFolder.mockRejectedValue(new Error('Creation failed'));
            
            const result = await ensureFolderExists(mockApp, 'problematic/folder');
            
            expect(result).toBe(false);
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith('problematic/folder');
        });

        it('should handle root path correctly', async () => {
            const result = await ensureFolderExists(mockApp, '');
            expect(result).toBe(true);
            expect(mockApp.vault.adapter.exists).not.toHaveBeenCalled();
        });

        it('should handle root slash correctly', async () => {
            const result = await ensureFolderExists(mockApp, '/');
            expect(result).toBe(true);
            expect(mockApp.vault.adapter.exists).not.toHaveBeenCalled();
        });

        it('should format path before processing', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(true);
            
            await ensureFolderExists(mockApp, '//messy///path//');
            
            expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith('messy/path');
        });

        it('should handle path formatting edge cases', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(false);
            mockApp.vault.createFolder.mockResolvedValue(undefined);
            
            await ensureFolderExists(mockApp, '/leading/slash/');
            
            expect(mockApp.vault.adapter.exists).toHaveBeenCalledWith('leading/slash');
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith('leading/slash');
        });

        it('should return false on adapter.exists error', async () => {
            mockApp.vault.adapter.exists.mockRejectedValue(new Error('Access denied'));
            
            const result = await ensureFolderExists(mockApp, 'test/folder');
            
            expect(result).toBe(false);
            expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
        });
    });
}); 