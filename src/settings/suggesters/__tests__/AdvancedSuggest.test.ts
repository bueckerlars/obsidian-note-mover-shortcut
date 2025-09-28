import { AdvancedSuggest } from '../AdvancedSuggest';
import { App, TFile, TFolder, getAllTags } from 'obsidian';
import { MetadataExtractor } from '../../../core/MetadataExtractor';

// Mock getAllTags
const mockGetAllTags = getAllTags as jest.MockedFunction<typeof getAllTags>;

// Mock MetadataExtractor
jest.mock('../../../core/MetadataExtractor');
const MockedMetadataExtractor = MetadataExtractor as jest.MockedClass<
  typeof MetadataExtractor
>;

describe('AdvancedSuggest', () => {
  let mockApp: any;
  let mockInputEl: HTMLInputElement;
  let advancedSuggest: AdvancedSuggest;
  let mockMetadataExtractor: jest.Mocked<MetadataExtractor>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock input element
    mockInputEl = {
      value: '',
      trigger: jest.fn(),
    } as any;

    // Mock metadata extractor
    mockMetadataExtractor = {
      extractAllTags: jest
        .fn()
        .mockReturnValue(new Set(['#tag1', '#tag2', '#work'])),
      isListProperty: jest.fn().mockReturnValue(false),
      parseListProperty: jest.fn().mockReturnValue([]),
    } as any;

    MockedMetadataExtractor.mockImplementation(() => mockMetadataExtractor);

    // Mock app
    mockApp = {
      metadataCache: {
        on: jest.fn(),
        off: jest.fn(),
        getFileCache: jest.fn().mockReturnValue({
          frontmatter: {
            status: 'completed',
            priority: 'high',
            authors: ['John Doe', 'Jane Smith'],
            tags: ['#work', '#project'],
          },
        }),
      },
      vault: {
        getAllLoadedFiles: jest.fn().mockReturnValue([
          Object.assign(Object.create(TFolder.prototype), {
            path: 'folder1',
            name: 'folder1',
          }),
          Object.assign(Object.create(TFolder.prototype), {
            path: 'folder2/subfolder',
            name: 'subfolder',
          }),
          Object.assign(Object.create(TFile.prototype), {
            path: 'file1.md',
            name: 'file1.md',
          }),
        ]),
        getMarkdownFiles: jest
          .fn()
          .mockReturnValue([
            { name: 'note1.md', path: 'note1.md' } as TFile,
            { name: 'note2.md', path: 'note2.md' } as TFile,
            { name: 'meeting-notes.md', path: 'meeting-notes.md' } as TFile,
          ]),
      },
    } as any;

    // Mock the getFileCache to return different data for different files
    mockApp.metadataCache.getFileCache.mockImplementation((file: any) => {
      if (file.name === 'note1.md') {
        return {
          frontmatter: {
            status: 'completed',
            priority: 'high',
            authors: ['John Doe', 'Jane Smith'],
            tags: ['#work', '#project'],
          },
        };
      }
      if (file.name === 'note2.md') {
        return {
          frontmatter: {
            status: 'pending',
            priority: 'low',
            authors: ['Alice Smith'],
          },
        };
      }
      return {
        frontmatter: {
          status: 'draft',
          priority: 'medium',
        },
      };
    });

    // Mock getAllTags
    mockGetAllTags.mockReturnValue(['#tag1', '#tag2', '#work']);

    // Create instance - this will call loadPropertyKeysAndValues() in constructor
    advancedSuggest = new AdvancedSuggest(mockApp, mockInputEl);
  });

  afterEach(() => {
    // Cleanup
    if (advancedSuggest) {
      advancedSuggest.destroy();
    }
  });

  describe('constructor and initialization', () => {
    it('should initialize with correct properties', () => {
      expect(advancedSuggest).toBeInstanceOf(AdvancedSuggest);
      expect(MockedMetadataExtractor).toHaveBeenCalledWith(mockApp);
      expect(mockApp.metadataCache.on).toHaveBeenCalledWith(
        'changed',
        expect.any(Function)
      );
    });

    it('should load initial data', () => {
      expect(mockMetadataExtractor.extractAllTags).toHaveBeenCalled();
      expect(mockApp.vault.getAllLoadedFiles).toHaveBeenCalled();
      expect(mockApp.vault.getMarkdownFiles).toHaveBeenCalled();
    });
  });

  describe('getSuggestions', () => {
    // Mock data is already set up in the main beforeEach

    it('should return type suggestions when query is empty', () => {
      const suggestions = advancedSuggest.getSuggestions('');

      expect(suggestions).toEqual([
        'tag: ',
        'content: ',
        'fileName: ',
        'created_at: ',
        'path: ',
        'updated_at: ',
        'property: ',
      ]);
    });

    it('should return filtered type suggestions', () => {
      const suggestions = advancedSuggest.getSuggestions('tag');

      expect(suggestions).toEqual(['tag: ']);
    });

    it('should return tag suggestions when tag type is selected', () => {
      const suggestions = advancedSuggest.getSuggestions('tag: work');

      expect(suggestions).toEqual(['tag: #work']);
    });

    it('should return file name suggestions when fileName type is selected', () => {
      const suggestions = advancedSuggest.getSuggestions('fileName: note');

      expect(suggestions).toEqual([
        'fileName: note1.md',
        'fileName: note2.md',
        'fileName: meeting-notes.md',
      ]);
    });

    it('should return path suggestions when path type is selected', () => {
      const suggestions = advancedSuggest.getSuggestions('path: folder');

      expect(suggestions).toEqual(['path: folder1', 'path: folder2/subfolder']);
    });

    it('should return empty array for content type', () => {
      const suggestions = advancedSuggest.getSuggestions('content: test');

      expect(suggestions).toEqual([]);
    });

    it('should return empty array for date types', () => {
      const suggestions = advancedSuggest.getSuggestions('created_at: 2023');

      expect(suggestions).toEqual([]);
    });

    it('should return property key suggestions when property type is selected', () => {
      const suggestions = advancedSuggest.getSuggestions('property: status');

      expect(suggestions).toEqual(['property: status']);
    });

    it('should return property value suggestions when property:key: is used', () => {
      // The property data should be loaded during construction
      const suggestions = advancedSuggest.getSuggestions(
        'property: status: comp'
      );

      // Since the property data is loaded during construction, we should get suggestions
      expect(suggestions).toEqual(['property: status: completed']);
    });

    it('should handle case-insensitive filtering', () => {
      const suggestions = advancedSuggest.getSuggestions('TAG: WORK');

      expect(suggestions).toEqual(['tag: #work']);
    });

    it('should handle partial matches', () => {
      const suggestions = advancedSuggest.getSuggestions('fileName: meet');

      expect(suggestions).toEqual(['fileName: meeting-notes.md']);
    });
  });

  describe('property suggestions', () => {
    beforeEach(() => {
      // Reset mocks for this describe block
      jest.clearAllMocks();

      // Re-setup the basic mocks
      mockMetadataExtractor = {
        extractAllTags: jest
          .fn()
          .mockReturnValue(new Set(['#tag1', '#tag2', '#work'])),
        isListProperty: jest.fn().mockReturnValue(false),
        parseListProperty: jest.fn().mockReturnValue([]),
      } as any;

      MockedMetadataExtractor.mockImplementation(() => mockMetadataExtractor);

      // Mock list property detection for authors specifically
      mockMetadataExtractor.isListProperty.mockImplementation(value => {
        return (
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === 'string'
        );
      });

      mockMetadataExtractor.parseListProperty.mockReturnValue([
        'John Doe',
        'Jane Smith',
      ]);

      // Recreate the instance with the new mocks
      advancedSuggest = new AdvancedSuggest(mockApp, mockInputEl);
    });

    it('should suggest property keys', () => {
      const suggestions = advancedSuggest.getSuggestions('property: stat');

      expect(suggestions).toEqual(['property: status']);
    });

    it('should suggest property values for a key', () => {
      const suggestions = advancedSuggest.getSuggestions(
        'property: status: comp'
      );

      expect(suggestions).toEqual(['property: status: completed']);
    });

    it('should handle list properties correctly', () => {
      const suggestions = advancedSuggest.getSuggestions(
        'property: authors: john'
      );

      expect(mockMetadataExtractor.isListProperty).toHaveBeenCalledWith([
        'John Doe',
        'Jane Smith',
      ]);
      expect(mockMetadataExtractor.parseListProperty).toHaveBeenCalledWith([
        'John Doe',
        'Jane Smith',
      ]);
      expect(suggestions).toEqual(['property: authors: John Doe']);
    });

    it('should sort property values alphabetically', () => {
      // Mock multiple values
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: {
          priority: 'high',
          status: 'pending',
        },
      });

      const suggestions = advancedSuggest.getSuggestions(
        'property: priority: h'
      );

      expect(suggestions).toEqual(['property: priority: high']);
    });
  });

  describe('renderSuggestion', () => {
    it('should set text content on element', () => {
      const mockEl = {
        setText: jest.fn(),
      } as any;

      advancedSuggest.renderSuggestion('test suggestion', mockEl);

      expect(mockEl.setText).toHaveBeenCalledWith('test suggestion');
    });
  });

  describe('selectSuggestion', () => {
    it('should handle type selection', () => {
      advancedSuggest.selectSuggestion('tag: ');

      expect(mockInputEl.value).toBe('tag: ');
      expect(mockInputEl.trigger).toHaveBeenCalledWith('input');
    });

    it('should handle property key selection', () => {
      // First select property type
      advancedSuggest.selectSuggestion('property: ');

      // Then select a property key
      advancedSuggest.selectSuggestion('property: status');

      expect(mockInputEl.value).toBe('property: status:');
      expect(mockInputEl.trigger).toHaveBeenCalledWith('input');
    });

    it('should handle complete property selection', () => {
      // Mock close method
      const closeSpy = jest.spyOn(advancedSuggest, 'close');

      // First select property type
      advancedSuggest.selectSuggestion('property: ');

      // Then select a complete property:key:value
      advancedSuggest.selectSuggestion('property: status: completed');

      expect(mockInputEl.value).toBe('property: status: completed');
      expect(mockInputEl.trigger).toHaveBeenCalledWith('input');
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle regular suggestion selection', () => {
      // Mock close method
      const closeSpy = jest.spyOn(advancedSuggest, 'close');

      // First select tag type
      advancedSuggest.selectSuggestion('tag: ');

      // Then select a tag
      advancedSuggest.selectSuggestion('tag: #work');

      expect(mockInputEl.value).toBe('tag: #work');
      expect(mockInputEl.trigger).toHaveBeenCalledWith('input');
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('data loading and refresh', () => {
    it('should refresh data when metadata changes', () => {
      // Get the refresh handler that was registered during construction
      const refreshHandler = mockApp.metadataCache.on.mock.calls[0][1];

      // Reset call counts for the methods we want to test
      mockMetadataExtractor.extractAllTags.mockClear();
      mockApp.vault.getAllLoadedFiles.mockClear();
      mockApp.vault.getMarkdownFiles.mockClear();

      // Call the refresh handler
      refreshHandler();

      // Verify that data loading methods were called
      expect(mockMetadataExtractor.extractAllTags).toHaveBeenCalledTimes(1); // Once in refresh
      expect(mockApp.vault.getAllLoadedFiles).toHaveBeenCalledTimes(1);
      expect(mockApp.vault.getMarkdownFiles).toHaveBeenCalledTimes(2); // Once in loadFileNames, once in loadPropertyKeysAndValues
    });

    it('should load tags correctly', () => {
      const suggestions = advancedSuggest.getSuggestions('tag: ');

      expect(suggestions).toEqual(['tag: #tag1', 'tag: #tag2', 'tag: #work']);
    });

    it('should load folders correctly', () => {
      const suggestions = advancedSuggest.getSuggestions('path: ');

      expect(suggestions).toEqual(['path: folder1', 'path: folder2/subfolder']);
    });

    it('should load file names correctly', () => {
      const suggestions = advancedSuggest.getSuggestions('fileName: ');

      expect(suggestions).toEqual([
        'fileName: note1.md',
        'fileName: note2.md',
        'fileName: meeting-notes.md',
      ]);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on destroy', () => {
      advancedSuggest.destroy();

      expect(mockApp.metadataCache.off).toHaveBeenCalledWith(
        'changed',
        expect.any(Function)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty query gracefully', () => {
      const suggestions = advancedSuggest.getSuggestions('');

      expect(suggestions).toEqual([
        'tag: ',
        'content: ',
        'fileName: ',
        'created_at: ',
        'path: ',
        'updated_at: ',
        'property: ',
      ]);
    });

    it('should handle whitespace-only query', () => {
      const suggestions = advancedSuggest.getSuggestions('   ');

      expect(suggestions).toEqual([
        'tag: ',
        'content: ',
        'fileName: ',
        'created_at: ',
        'path: ',
        'updated_at: ',
        'property: ',
      ]);
    });

    it('should handle unknown type gracefully', () => {
      // This shouldn't happen in normal usage, but test for robustness
      const suggestions = advancedSuggest.getSuggestions('unknown: test');

      expect(suggestions).toEqual([]);
    });

    it('should handle property suggestions with no matching key', () => {
      const suggestions = advancedSuggest.getSuggestions(
        'property: nonexistent: value'
      );

      expect(suggestions).toEqual([]);
    });

    it('should handle metadata cache errors gracefully', () => {
      mockApp.metadataCache.getFileCache.mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Should not throw
      expect(() => {
        advancedSuggest.getSuggestions('property: ');
      }).not.toThrow();
    });
  });
});
