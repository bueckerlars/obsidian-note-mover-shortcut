import { App, TFile } from 'obsidian';
import { getAllTags } from 'obsidian';
import { FileMetadata } from '../types/Common';
import { handleError } from '../utils/Error';

/**
 * Extracts and provides standardized access to file metadata
 * used throughout the application for rule matching and processing
 */
export class MetadataExtractor {
  constructor(private app: App) {}

  /**
   * Extracts complete metadata from a file
   * Handles errors gracefully and provides null values for unavailable data
   */
  public async extractFileMetadata(file: TFile): Promise<FileMetadata> {
    try {
      // Basic file information
      const fileName = file.name;
      const filePath = file.path;

      // File system dates
      const createdAt =
        file.stat && file.stat.ctime ? new Date(file.stat.ctime) : null;
      const updatedAt =
        file.stat && file.stat.mtime ? new Date(file.stat.mtime) : null;

      // Metadata cache
      const fileCache = this.app.metadataCache.getFileCache(file);
      const tags = getAllTags(fileCache || {}) || [];
      const properties = fileCache?.frontmatter || {};

      // File content (optional, with error handling)
      let fileContent = '';
      try {
        fileContent = await this.app.vault.read(file);
      } catch (error) {
        // Content is optional - don't fail if we can't read it
        // Could log this for debugging if needed
      }

      return {
        fileName,
        filePath,
        tags,
        properties,
        fileContent,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      handleError(
        error,
        `Error extracting metadata for file '${file.path}'`,
        false
      );

      // Return minimal metadata on error
      return {
        fileName: file.name,
        filePath: file.path,
        tags: [],
        properties: {},
        fileContent: '',
        createdAt: null,
        updatedAt: null,
      };
    }
  }

  /**
   * Extracts only basic metadata without content (faster)
   * Useful when content is not needed for rule matching
   */
  public async extractBasicMetadata(
    file: TFile
  ): Promise<Omit<FileMetadata, 'fileContent'>> {
    try {
      const fileName = file.name;
      const filePath = file.path;
      const createdAt =
        file.stat && file.stat.ctime ? new Date(file.stat.ctime) : null;
      const updatedAt =
        file.stat && file.stat.mtime ? new Date(file.stat.mtime) : null;

      const fileCache = this.app.metadataCache.getFileCache(file);
      const tags = getAllTags(fileCache || {}) || [];
      const properties = fileCache?.frontmatter || {};

      return {
        fileName,
        filePath,
        tags,
        properties,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      handleError(
        error,
        `Error extracting basic metadata for file '${file.path}'`,
        false
      );

      return {
        fileName: file.name,
        filePath: file.path,
        tags: [],
        properties: {},
        createdAt: null,
        updatedAt: null,
      };
    }
  }

  /**
   * Extracts tags from all markdown files synchronously
   * Returns a Set of unique tags for faster lookup
   */
  public extractAllTags(): Set<string> {
    const tags = new Set<string>();
    const files = this.app.vault.getMarkdownFiles();

    files.forEach(file => {
      try {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const fileTags = getAllTags(fileCache || {}) || [];
        fileTags.forEach(tag => tags.add(tag));
      } catch (error) {
        // Silently ignore files that can't be processed
      }
    });

    return tags;
  }
}
