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

  /**
   * Parses a property value to extract individual list items
   * Handles both single values and list values (arrays or comma-separated strings)
   *
   * @param value - The property value to parse
   * @returns Array of individual values
   */
  public parseListProperty(value: any): string[] {
    if (value === null || value === undefined) {
      return [];
    }

    // If it's already an array, return it as strings
    if (Array.isArray(value)) {
      return value
        .map(item => String(item).trim())
        .filter(item => item.length > 0);
    }

    // If it's a string, try to parse it as comma-separated values
    if (typeof value === 'string') {
      // Handle both comma-separated and newline-separated values
      const values = value
        .split(/[,\n]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);

      return values;
    }

    // For other types, convert to string
    return [String(value).trim()].filter(item => item.length > 0);
  }

  /**
   * Checks if a property value represents a list (multiple values)
   *
   * @param value - The property value to check
   * @returns True if the value represents multiple items
   */
  public isListProperty(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 1;
    }

    if (typeof value === 'string') {
      // Check if it contains separators (comma or newline)
      return /[,\n]/.test(value) && value.split(/[,\n]/).length > 1;
    }

    return false;
  }

  /**
   * Extracts complete metadata from a file for RuleV2 system
   * Includes additional fields: extension, links, embeds, headings
   *
   * @param file - TFile to extract metadata from
   * @returns Complete FileMetadata with V2 fields
   */
  public async extractFileMetadataV2(file: TFile): Promise<FileMetadata> {
    try {
      // Get base metadata using existing method
      const baseMetadata = await this.extractFileMetadata(file);

      // Extract additional V2-specific metadata
      const fileCache = this.app.metadataCache.getFileCache(file);

      // Extension from file name
      const extension = file.extension || '';

      // Links from metadata cache
      const links: string[] = [];
      if (fileCache?.links) {
        fileCache.links.forEach(link => {
          if (link.link && typeof link.link === 'string') {
            links.push(link.link);
          }
        });
      }

      // Embeds from metadata cache
      const embeds: string[] = [];
      if (fileCache?.embeds) {
        fileCache.embeds.forEach(embed => {
          if (embed.link && typeof embed.link === 'string') {
            embeds.push(embed.link);
          }
        });
      }

      // Headings from metadata cache
      const headings: string[] = [];
      if (fileCache?.headings) {
        fileCache.headings.forEach(heading => {
          if (heading.heading && typeof heading.heading === 'string') {
            headings.push(heading.heading);
          }
        });
      }

      return {
        ...baseMetadata,
        extension,
        links,
        embeds,
        headings,
      };
    } catch (error) {
      handleError(
        error,
        `Error extracting V2 metadata for file '${file.path}'`,
        false
      );

      // Return base metadata on error
      return await this.extractFileMetadata(file);
    }
  }
}
