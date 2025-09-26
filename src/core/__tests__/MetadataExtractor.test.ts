import { MetadataExtractor } from '../MetadataExtractor';
import { App, TFile, getAllTags } from 'obsidian';

// Mock getAllTags to return empty array by default
const mockGetAllTags = getAllTags as jest.MockedFunction<typeof getAllTags>;
mockGetAllTags.mockReturnValue([]);

describe('MetadataExtractor', () => {
  let mockApp: any;
  let mockFile: TFile;
  let metadataExtractor: MetadataExtractor;

  beforeEach(() => {
    mockApp = {
      metadataCache: {
        getFileCache: jest.fn(),
      },
      vault: {
        read: jest.fn(),
        getMarkdownFiles: jest.fn(),
      },
    };

    // Reset all mocks
    jest.clearAllMocks();

    mockFile = {
      name: 'test.md',
      path: 'test/test.md',
      stat: {
        ctime: Date.now(),
        mtime: Date.now(),
      },
    } as TFile;

    metadataExtractor = new MetadataExtractor(mockApp);
  });

  describe('extractFileMetadata', () => {
    it('should extract complete metadata successfully', async () => {
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: { status: 'completed', priority: 'high' },
        tags: [],
      });
      mockApp.vault.read.mockResolvedValue(
        '# Test content\n\nSome content here'
      );

      const result = await metadataExtractor.extractFileMetadata(mockFile);

      expect(result.fileName).toBe('test.md');
      expect(result.filePath).toBe('test/test.md');
      expect(result.tags).toEqual([]);
      expect(result.properties).toEqual({
        status: 'completed',
        priority: 'high',
      });
      expect(result.fileContent).toBe('# Test content\n\nSome content here');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle file read error gracefully', async () => {
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: { status: 'completed' },
        tags: [],
      });
      mockApp.vault.read.mockRejectedValue(new Error('File read failed'));

      const result = await metadataExtractor.extractFileMetadata(mockFile);

      expect(result.fileName).toBe('test.md');
      expect(result.filePath).toBe('test/test.md');
      expect(result.tags).toEqual([]);
      expect(result.fileContent).toBe(''); // Empty content on error
      expect(result.properties).toEqual({ status: 'completed' });
    });

    it('should handle metadata cache error gracefully', async () => {
      mockApp.metadataCache.getFileCache.mockImplementation(() => {
        throw new Error('Cache access failed');
      });

      const result = await metadataExtractor.extractFileMetadata(mockFile);

      expect(result.fileName).toBe('test.md');
      expect(result.filePath).toBe('test/test.md');
      expect(result.tags).toEqual([]);
      expect(result.properties).toEqual({});
      expect(result.fileContent).toBe('');
      expect(result.createdAt).toBeNull();
      expect(result.updatedAt).toBeNull();
    });

    it('should handle null stat gracefully', async () => {
      const fileWithNullStat = { ...mockFile, stat: null } as any;

      const result =
        await metadataExtractor.extractFileMetadata(fileWithNullStat);

      expect(result.createdAt).toBeNull();
      expect(result.updatedAt).toBeNull();
    });

    it('should extract tags from cache', async () => {
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: {},
        tags: [{ tag: '#tag1' }, { tag: '#tag2/subtag' }],
      });

      // Mock getAllTags to return the tags from cache
      mockGetAllTags.mockReturnValue(['#tag1', '#tag2/subtag']);

      const result = await metadataExtractor.extractFileMetadata(mockFile);

      expect(result.tags).toEqual(['#tag1', '#tag2/subtag']);
    });
  });

  describe('extractBasicMetadata', () => {
    it('should extract basic metadata without content', async () => {
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: { status: 'pending' },
        tags: [],
      });

      // Mock getAllTags to return empty array
      mockGetAllTags.mockReturnValue([]);

      const result = await metadataExtractor.extractBasicMetadata(mockFile);

      expect(result.fileName).toBe('test.md');
      expect(result.filePath).toBe('test/test.md');
      expect(result.tags).toEqual([]);
      expect(result.properties).toEqual({ status: 'pending' });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result).not.toHaveProperty('fileContent');
    });

    it('should handle basic metadata cache error', async () => {
      mockApp.metadataCache.getFileCache.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = await metadataExtractor.extractBasicMetadata(mockFile);

      expect(result.fileName).toBe('test.md');
      expect(result.filePath).toBe('test/test.md');
      expect(result.tags).toEqual([]);
      expect(result.properties).toEqual({});
      expect(result.createdAt).toBeNull();
      expect(result.updatedAt).toBeNull();
    });
  });

  describe('extractAllTags', () => {
    it('should extract tags from all markdown files', () => {
      const mockFiles = [
        { ...mockFile, name: 'file1.md', path: 'file1.md' },
        { ...mockFile, name: 'file2.md', path: 'file2.md' },
      ] as TFile[];

      mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles);
      mockApp.metadataCache.getFileCache
        .mockReturnValueOnce({ tags: [{ tag: '#tag1' }] })
        .mockReturnValueOnce({ tags: [{ tag: '#tag2' }, { tag: '#tag3' }] });

      // Mock getAllTags to return the tags for each file
      mockGetAllTags
        .mockReturnValueOnce(['#tag1'])
        .mockReturnValueOnce(['#tag2', '#tag3']);

      const result = metadataExtractor.extractAllTags();

      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result)).toEqual(['#tag1', '#tag2', '#tag3']);
    });

    it('should handle files with no tags', () => {
      const mockFiles = [
        { ...mockFile, name: 'file1.md', path: 'file1.md' },
      ] as TFile[];

      mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles);
      mockApp.metadataCache.getFileCache.mockReturnValue({});

      const result = metadataExtractor.extractAllTags();

      expect(result.size).toBe(0);
    });

    it('should handle cache errors gracefully', () => {
      const mockFiles = [
        { ...mockFile, name: 'file1.md', path: 'file1.md' },
        { ...mockFile, name: 'file2.md', path: 'file2.md' },
      ] as TFile[];

      mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles);
      mockApp.metadataCache.getFileCache.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = metadataExtractor.extractAllTags();

      expect(result.size).toBe(0); // Should not throw, just return empty set
    });

    it('should deduplicate tags', () => {
      const mockFiles = [
        { ...mockFile, name: 'file1.md', path: 'file1.md' },
        { ...mockFile, name: 'file2.md', path: 'file2.md' },
      ] as TFile[];

      mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles);
      mockApp.metadataCache.getFileCache.mockReturnValue({
        tags: [{ tag: '#duplicate' }, { tag: '#unique' }],
      });

      // Mock getAllTags to return the tags
      mockGetAllTags.mockReturnValue(['#duplicate', '#unique']);

      const result = metadataExtractor.extractAllTags();

      expect(Array.from(result)).toEqual(['#duplicate', '#unique']);
    });
  });
});
