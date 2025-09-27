import { RuleManager } from '../RuleManager';
import { MetadataExtractor } from '../MetadataExtractor';
import { App, TFile, getAllTags } from 'obsidian';

// Mock the MetadataExtractor
jest.mock('../MetadataExtractor');

describe('RuleManager', () => {
  let mockApp: any;
  let mockFile: TFile;
  let ruleManager: RuleManager;
  let mockMetadataExtractor: jest.Mocked<MetadataExtractor>;

  beforeEach(() => {
    mockApp = {
      metadataCache: {
        getFileCache: jest.fn().mockReturnValue({
          tags: [{ tag: '#tag1' }],
          frontmatter: {
            status: 'completed',
            priority: 'high',
            project: 'work',
          },
        }),
      },
      vault: {
        read: jest.fn().mockResolvedValue('file content'),
      },
    };
    mockFile = {
      name: 'file.md',
      path: 'folder/file.md',
      stat: { ctime: Date.now(), mtime: Date.now() },
    } as any;

    // Create mock for MetadataExtractor
    mockMetadataExtractor = {
      extractFileMetadata: jest.fn(),
      extractBasicMetadata: jest.fn(),
      extractAllTags: jest.fn(),
    } as unknown as jest.Mocked<MetadataExtractor>;

    // Mock the constructor
    (
      MetadataExtractor as jest.MockedClass<typeof MetadataExtractor>
    ).mockImplementation(() => mockMetadataExtractor);

    ruleManager = new RuleManager(mockApp, 'default');

    // Set up default mock behavior
    mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
      fileName: 'file.md',
      filePath: 'folder/file.md',
      tags: ['#tag1'],
      properties: { status: 'completed', priority: 'high', project: 'work' },
      fileContent: 'file content',
      createdAt: new Date(mockFile.stat.ctime),
      updatedAt: new Date(mockFile.stat.mtime),
    });

    // Mock getAllTags to return default tags
    const mockGetAllTags = getAllTags as jest.MockedFunction<typeof getAllTags>;
    mockGetAllTags.mockReturnValue(['#tag1']);
  });

  it('should skip file if fileName filter matches (blacklist)', async () => {
    ruleManager.setFilter(['fileName: file.md'], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should skip file if path filter matches (blacklist)', async () => {
    ruleManager.setFilter(['path: folder/file.md'], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should skip file if folder path filter matches (blacklist)', async () => {
    // Test that folder blacklist works for files in subfolders
    const templateFile = {
      ...mockFile,
      path: 'Templates/Meeting Notes.md',
    };
    ruleManager.setFilter(['path: Templates'], false);
    const result = await ruleManager.moveFileBasedOnTags(templateFile);
    expect(result).toBeNull();
  });

  it('should skip file if content filter matches (blacklist)', async () => {
    ruleManager.setFilter(['content: file content'], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should skip file if created_at filter matches (blacklist)', async () => {
    const date = new Date(mockFile.stat.ctime).toISOString().slice(0, 10);
    ruleManager.setFilter([`created_at: ${date}`], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should skip file if updated_at filter matches (blacklist)', async () => {
    const date = new Date(mockFile.stat.mtime).toISOString().slice(0, 10);
    ruleManager.setFilter([`updated_at: ${date}`], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should not skip file if skipFilter=true but still return null if no rules match', async () => {
    ruleManager.setFilter(['fileName: file.md'], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile, true);
    expect(result).toBeNull();
  });

  it('should handle invalid filter string gracefully', async () => {
    ruleManager.setFilter(['invalidfilter'], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should return rule path if tag matches', async () => {
    ruleManager.setRules([{ criteria: 'tag: #tag1', path: 'special' }]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBe('special');
  });

  it('should return rule path if fileName matches', async () => {
    ruleManager.setRules([{ criteria: 'fileName: file.md', path: 'special' }]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBe('special');
  });

  it('should return rule path if path matches', async () => {
    ruleManager.setRules([
      { criteria: 'path: folder/file.md', path: 'special' },
    ]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBe('special');
  });

  it('should return rule path if content matches', async () => {
    ruleManager.setRules([
      { criteria: 'content: file content', path: 'special' },
    ]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBe('special');
  });

  it('should return defaultFolder if no rules match', async () => {
    ruleManager.setRules([{ criteria: 'tag: #other', path: 'special' }]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should handle invalid rule criteria format', async () => {
    ruleManager.setRules([{ criteria: 'invalid-format', path: 'special' }]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should handle created_at rule with null createdAt', async () => {
    mockFile.stat = { ctime: null, mtime: Date.now() } as any;
    ruleManager.setRules([
      { criteria: 'created_at: 2023-01-01', path: 'date-folder' },
    ]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should handle updated_at rule with null updatedAt', async () => {
    mockFile.stat = { ctime: Date.now(), mtime: null } as any;
    ruleManager.setRules([
      { criteria: 'updated_at: 2023-01-01', path: 'date-folder' },
    ]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should handle missing tags gracefully', async () => {
    mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({});
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should handle missing rules gracefully', async () => {
    ruleManager.setRules([]);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should handle null createdAt/updatedAt', async () => {
    mockFile.stat = { ctime: undefined, mtime: undefined } as any;
    ruleManager.setFilter(['created_at: 2023-01-01'], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should handle error in file read gracefully', async () => {
    mockApp.vault.read = jest.fn().mockRejectedValue(new Error('fail'));
    ruleManager.setFilter(['content: something'], false);
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull();
  });

  it('should handle error in metadata extraction gracefully', async () => {
    mockMetadataExtractor.extractFileMetadata.mockRejectedValue(
      new Error('fail')
    );
    const result = await ruleManager.moveFileBasedOnTags(mockFile);
    expect(result).toBeNull(); // Da catch-Block return null
  });

  // Tests for hierarchical tag matching (subtag feature)
  describe('Hierarchical Tag Matching', () => {
    beforeEach(() => {
      // Reset mock to avoid interference from other tests
      jest.clearAllMocks();
    });

    it('should match parent tag when file has subtag', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#food/recipes'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([{ criteria: 'tag: #food', path: 'food-folder' }]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('food-folder');
    });

    it('should prioritize more specific tag rules over general ones', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#food/recipes'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([
        { criteria: 'tag: #food', path: 'food-folder' },
        { criteria: 'tag: #food/recipes', path: 'recipes-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('recipes-folder');
    });

    it('should match exact tag over subtag pattern', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#food'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([{ criteria: 'tag: #food', path: 'food-folder' }]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('food-folder');
    });

    it('should handle multiple subtag levels', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#food/recipes/italian'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([
        { criteria: 'tag: #food', path: 'food-folder' },
        { criteria: 'tag: #food/recipes', path: 'recipes-folder' },
        { criteria: 'tag: #food/recipes/italian', path: 'italian-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('italian-folder');
    });

    it('should not match unrelated tags', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#foods'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([{ criteria: 'tag: #food', path: 'food-folder' }]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should handle hierarchical filtering in blacklist', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#food/recipes'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setFilter(['tag: #food'], false); // blacklist
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull(); // Should be filtered out
    });

    it('should handle hierarchical filtering in whitelist', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#food/recipes'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setFilter(['tag: #food'], true); // whitelist
      ruleManager.setRules([{ criteria: 'tag: #food', path: 'food-folder' }]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('food-folder'); // Should pass whitelist and match rule
    });
  });

  // Property-based tests
  describe('Property matching', () => {
    it('should skip file if property filter matches exact value (blacklist)', async () => {
      ruleManager.setFilter(['property: status:completed'], false);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should skip file if property exists filter matches (blacklist)', async () => {
      ruleManager.setFilter(['property: status'], false);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should move file if property filter matches (whitelist)', async () => {
      ruleManager.setFilter(['property: status:completed'], true);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should move file based on property rule', async () => {
      ruleManager.setRules([
        { criteria: 'property: status:completed', path: 'archive' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('archive');
    });

    it('should move file based on property existence rule', async () => {
      ruleManager.setRules([
        { criteria: 'property: priority', path: 'priority-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('priority-folder');
    });

    it('should return default if property does not exist', async () => {
      ruleManager.setRules([
        { criteria: 'property: nonexistent:value', path: 'nonexistent-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should return default if property value does not match', async () => {
      ruleManager.setRules([
        { criteria: 'property: status:pending', path: 'pending-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should handle missing frontmatter gracefully', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: {}, // No frontmatter properties
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([
        { criteria: 'property: status:completed', path: 'archive' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should handle case insensitive property values', async () => {
      ruleManager.setRules([
        { criteria: 'property: status:COMPLETED', path: 'archive' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('archive');
    });

    it('should handle numeric property values', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: { priority: 1, status: 'completed' },
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([
        { criteria: 'property: priority:1', path: 'priority-1' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('priority-1');
    });

    it('should handle null property values', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: { status: null, priority: undefined },
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([
        { criteria: 'property: status:null', path: 'null-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should handle undefined property values', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: { status: undefined },
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([
        { criteria: 'property: status:undefined', path: 'undefined-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });
  });

  // Tests for generatePreviewForFile
  describe('generatePreviewForFile', () => {
    it('should generate preview for file with matching rule', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([{ criteria: 'tag: #tag1', path: 'special' }]);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(true);
      expect(preview.targetPath).toBe('special');
      expect(preview.matchedRule).toBe('tag: #tag1');
    });

    it('should generate preview for file blocked by blacklist filter', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setFilter(['tag: #tag1'], false);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('Blocked by blacklist filter');
    });

    it('should generate preview for file not in whitelist', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setFilter(['tag: #other'], true);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('Not in whitelist');
    });

    it('should generate preview for file with no matching rules (default folder)', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([{ criteria: 'tag: #other', path: 'special' }]);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('No matching rule found');
    });

    it('should handle error in generatePreviewForFile', async () => {
      mockMetadataExtractor.extractFileMetadata.mockRejectedValue(
        new Error('fail')
      );
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('Error: fail');
    });

    it('should skip filter when skipFilter=true but still not move if no rules match', async () => {
      ruleManager.setFilter(['tag: #tag1'], false);
      const preview = await ruleManager.generatePreviewForFile(mockFile, true);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('No matching rule found');
    });

    it('should handle property-based filtering in preview', async () => {
      ruleManager.setFilter(['property: status:completed'], false);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.blockReason).toBe('Blocked by blacklist filter');
    });

    it('should handle fileName-based filtering in preview', async () => {
      ruleManager.setFilter(['fileName: file.md'], false);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.blockReason).toBe('Blocked by blacklist filter');
    });

    it('should handle path-based filtering in preview', async () => {
      ruleManager.setFilter(['path: folder/file.md'], false);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.blockReason).toBe('Blocked by blacklist filter');
    });

    it('should handle content-based filtering in preview', async () => {
      ruleManager.setFilter(['content: file content'], false);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.blockReason).toBe('Blocked by blacklist filter');
    });

    it('should handle created_at filtering in preview', async () => {
      const date = new Date(mockFile.stat.ctime).toISOString().slice(0, 10);
      ruleManager.setFilter([`created_at: ${date}`], false);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.blockReason).toBe('Blocked by blacklist filter');
    });

    it('should handle updated_at filtering in preview', async () => {
      const date = new Date(mockFile.stat.mtime).toISOString().slice(0, 10);
      ruleManager.setFilter([`updated_at: ${date}`], false);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.blockReason).toBe('Blocked by blacklist filter');
    });

    it('should handle invalid rule criteria in preview', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([{ criteria: 'invalid-format', path: 'special' }]);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('No matching rule found');
    });

    it('should handle created_at rule with null createdAt in preview', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: {},
        fileContent: 'file content',
        createdAt: null,
        updatedAt: new Date(mockFile.stat.mtime),
      });
      ruleManager.setRules([
        { criteria: 'created_at: 2023-01-01', path: 'date-folder' },
      ]);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('No matching rule found');
    });

    it('should handle updated_at rule with null updatedAt in preview', async () => {
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#tag1'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: null,
      });
      ruleManager.setRules([
        { criteria: 'updated_at: 2023-01-01', path: 'date-folder' },
      ]);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('No matching rule found');
    });
  });

  // Tests for rule-based movement (onlyMoveNotesWithRules is now always true)
  describe('rule-based movement', () => {
    it('should return null when no rules match (files without rules are skipped)', async () => {
      ruleManager.setRules([{ criteria: 'tag: #other', path: 'custom/path' }]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBeNull();
    });

    it('should return rule path when rule matches', async () => {
      ruleManager.setRules([{ criteria: 'tag: #tag1', path: 'custom/path' }]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('custom/path');
    });

    it('should generate preview with willBeMoved false when no rules match', async () => {
      ruleManager.setRules([{ criteria: 'tag: #other', path: 'custom/path' }]);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBeNull();
      expect(preview.blockReason).toBe('No matching rule found');
    });

    it('should generate preview with willBeMoved true when rule matches', async () => {
      ruleManager.setRules([{ criteria: 'tag: #tag1', path: 'custom/path' }]);
      const preview = await ruleManager.generatePreviewForFile(mockFile);
      expect(preview.willBeMoved).toBe(true);
      expect(preview.targetPath).toBe('custom/path');
      expect(preview.matchedRule).toBe('tag: #tag1');
    });

    it('should generate preview with willBeMoved false when file is already in correct folder', async () => {
      // Mock file that is already in the target folder
      const fileInCorrectFolder = {
        ...mockFile,
        path: 'custom/path/file.md',
      };

      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'custom/path/file.md', // File is already in the target folder
        tags: ['#tag1'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });

      ruleManager.setRules([{ criteria: 'tag: #tag1', path: 'custom/path' }]);
      const preview =
        await ruleManager.generatePreviewForFile(fileInCorrectFolder);

      expect(preview.willBeMoved).toBe(false);
      expect(preview.targetPath).toBe('custom/path');
      expect(preview.matchedRule).toBe('tag: #tag1');
      expect(preview.blockReason).toBe('File is already in the correct folder');
    });
  });

  // Tests for various criteria types
  describe('Rule Criteria Types', () => {
    it('should match fileName criteria', async () => {
      ruleManager.setRules([
        { criteria: 'fileName: file.md', path: 'test-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('test-folder');
    });

    it('should match path criteria', async () => {
      ruleManager.setRules([
        { criteria: 'path: folder/file.md', path: 'path-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('path-folder');
    });

    it('should match content criteria', async () => {
      ruleManager.setRules([
        { criteria: 'content: file content', path: 'content-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('content-folder');
    });

    it('should match created_at criteria', async () => {
      const date = new Date(mockFile.stat.ctime).toISOString().slice(0, 10);
      ruleManager.setRules([
        { criteria: `created_at: ${date}`, path: 'date-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('date-folder');
    });

    it('should match updated_at criteria', async () => {
      const date = new Date(mockFile.stat.mtime).toISOString().slice(0, 10);
      ruleManager.setRules([
        { criteria: `updated_at: ${date}`, path: 'updated-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('updated-folder');
    });

    it('should match property criteria with key only', async () => {
      ruleManager.setRules([
        { criteria: 'property: status', path: 'property-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('property-folder');
    });

    it('should match property criteria with key:value', async () => {
      ruleManager.setRules([
        { criteria: 'property: status:completed', path: 'status-folder' },
      ]);
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('status-folder');
    });
  });

  // Tests for tag sorting by specificity
  describe('Rule Sorting by Specificity', () => {
    it('should prioritize more specific tag rules', async () => {
      // Mock file with food/recipes/italian tag
      mockMetadataExtractor.extractFileMetadata.mockResolvedValue({
        fileName: 'file.md',
        filePath: 'folder/file.md',
        tags: ['#food/recipes/italian'],
        properties: {},
        fileContent: 'file content',
        createdAt: new Date(mockFile.stat.ctime),
        updatedAt: new Date(mockFile.stat.mtime),
      });

      ruleManager.setRules([
        { criteria: 'tag: #food', path: 'food-folder' },
        { criteria: 'tag: #food/recipes', path: 'recipes-folder' },
        { criteria: 'tag: #food/recipes/italian', path: 'italian-folder' },
      ]);

      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('italian-folder'); // Most specific should match first
    });

    it('should handle mixed criteria types in sorting', async () => {
      ruleManager.setRules([
        { criteria: 'fileName: file.md', path: 'filename-folder' },
        { criteria: 'tag: #food', path: 'food-folder' },
        { criteria: 'tag: #food/recipes', path: 'recipes-folder' },
      ]);

      // Should match fileName rule first (not a tag rule, so original order preserved)
      const result = await ruleManager.moveFileBasedOnTags(mockFile);
      expect(result).toBe('filename-folder');
    });
  });

  // Tests for generateMovePreview
  describe('generateMovePreview', () => {
    it('should generate preview for multiple files', async () => {
      const files = [
        mockFile,
        { ...mockFile, name: 'file2.md', path: 'folder/file2.md' },
      ];
      ruleManager.setRules([{ criteria: 'tag: #tag1', path: 'special' }]);
      const preview = await ruleManager.generateMovePreview(
        files,
        true,
        false,
        false
      );
      expect(preview.successfulMoves).toHaveLength(2);
      expect(preview.totalFiles).toBe(2);
      expect(preview.settings.isFilterWhitelist).toBe(false);
    });

    it('should only include files that will be moved', async () => {
      const files = [
        mockFile,
        { ...mockFile, name: 'file2.md', path: 'folder/file2.md' },
      ];

      // Mock different metadata for each file
      mockMetadataExtractor.extractFileMetadata.mockImplementation(
        async file => {
          if (file.name === 'file2.md') {
            return {
              fileName: 'file2.md',
              filePath: 'folder/file2.md',
              tags: ['#tag1'],
              properties: {},
              fileContent: 'file2 content',
              createdAt: new Date(mockFile.stat.ctime),
              updatedAt: new Date(mockFile.stat.mtime),
            };
          } else {
            return {
              fileName: 'file.md',
              filePath: 'folder/file.md',
              tags: ['#tag1'],
              properties: {},
              fileContent: 'file content',
              createdAt: new Date(mockFile.stat.ctime),
              updatedAt: new Date(mockFile.stat.mtime),
            };
          }
        }
      );

      ruleManager.setRules([{ criteria: 'tag: #tag1', path: 'special' }]);
      ruleManager.setFilter(['fileName: file2.md'], false);
      const preview = await ruleManager.generateMovePreview(
        files,
        true,
        true,
        false
      );
      expect(preview.successfulMoves).toHaveLength(1);
      expect(preview.successfulMoves[0].fileName).toBe('file.md');
    });

    it('should handle empty file list', async () => {
      const preview = await ruleManager.generateMovePreview(
        [],
        true,
        false,
        false
      );
      expect(preview.successfulMoves).toHaveLength(0);
      expect(preview.totalFiles).toBe(0);
    });
  });
});
