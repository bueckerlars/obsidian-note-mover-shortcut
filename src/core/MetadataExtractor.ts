import { App, TFile } from 'obsidian';
import { getAllTags } from 'obsidian';
import { FileMetadata } from '../types/Common';
import { handleError } from '../utils/Error';
import { parseListProperty as parseListPropertyDomain } from '../domain/property/parseListProperty';
import { isListProperty as isListPropertyDomain } from '../domain/property/isListProperty';

/**
 * Extracts and provides standardized access to file metadata
 * used throughout the application for rule matching and processing
 */
export class MetadataExtractor {
  constructor(private app: App) {}

  /**
   * Extracts complete metadata from a file.
   * @param file - TFile to extract metadata from
   * @param needsContent - When false, skips the expensive vault.read() call.
   *                       Pass true only when content:-based rules are configured.
   */
  public async extractFileMetadata(
    file: TFile,
    needsContent = true
  ): Promise<FileMetadata> {
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

      let fileContent = '';
      if (needsContent) {
        try {
          fileContent = await this.app.vault.read(file);
        } catch {
          // Content is optional - don't fail if we can't read it
        }
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
    return parseListPropertyDomain(value);
  }

  /**
   * Checks if a property value represents a list (multiple values)
   *
   * @param value - The property value to check
   * @returns True if the value represents multiple items
   */
  public isListProperty(value: any): boolean {
    return isListPropertyDomain(value);
  }

  /**
   * Extracts complete metadata from a file for RuleV2 system
   * Includes additional fields: extension, links, embeds, headings
   *
   * @param file - TFile to extract metadata from
   * @param needsContent - When true, reads file body (for blacklist `content:` filters).
   * @returns Complete FileMetadata with V2 fields
   */
  public async extractFileMetadataV2(
    file: TFile,
    needsContent = false
  ): Promise<FileMetadata> {
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
      const extension = file.extension || '';

      const links: string[] = [];
      if (fileCache?.links) {
        for (const link of fileCache.links) {
          if (link.link && typeof link.link === 'string') {
            links.push(link.link);
          }
        }
      }

      const embeds: string[] = [];
      if (fileCache?.embeds) {
        for (const embed of fileCache.embeds) {
          if (embed.link && typeof embed.link === 'string') {
            embeds.push(embed.link);
          }
        }
      }

      const headings: string[] = [];
      if (fileCache?.headings) {
        for (const heading of fileCache.headings) {
          if (heading.heading && typeof heading.heading === 'string') {
            headings.push(heading.heading);
          }
        }
      }

      let fileContent = '';
      if (needsContent) {
        try {
          fileContent = await this.app.vault.read(file);
        } catch {
          // optional
        }
      }

      return {
        fileName,
        filePath,
        tags,
        properties,
        fileContent,
        createdAt,
        updatedAt,
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

      return {
        fileName: file.name,
        filePath: file.path,
        tags: [],
        properties: {},
        fileContent: '',
        createdAt: null,
        updatedAt: null,
        extension: '',
        links: [],
        embeds: [],
        headings: [],
      };
    }
  }
}
