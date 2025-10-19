import { App, TFile } from 'obsidian';
import { NoticeManager } from '../utils/NoticeManager';
import { Rule } from '../types/Rule';
import { PreviewEntry, MovePreview } from '../types/MovePreview';
import { createError, handleError } from '../utils/Error';
import { combinePath } from '../utils/PathUtils';
import { MetadataExtractor } from './MetadataExtractor';
import { RuleMatcher } from './RuleMatcher';

/**
 * RuleManager for Rule V1 system
 * @deprecated This class uses the legacy Rule V1 format. Will be replaced by RuleV2 system in future versions.
 */
export class RuleManager {
  private rules: Rule[] = [];
  private filter: string[] = [];
  private metadataExtractor: MetadataExtractor;
  private ruleMatcher: RuleMatcher;

  constructor(
    private app: App,
    private defaultFolder: string
  ) {
    this.metadataExtractor = new MetadataExtractor(app);
    this.ruleMatcher = new RuleMatcher(this.metadataExtractor);
  }

  public setRules(rules: Rule[]): void {
    this.rules = rules;
  }

  public setFilter(filter: string[]): void {
    this.filter = filter;
  }

  /**
   * Processes a single file against rules and filters
   *
   * This method evaluates ONLY the specified file against the configured
   * rules and filters. It does NOT scan the entire vault.
   *
   * @param file - The specific TFile to evaluate
   * @param skipFilter - Whether to skip filter evaluation
   * @returns Target folder path if rule matches, null otherwise
   */
  public async moveFileBasedOnTags(
    file: TFile,
    skipFilter = false
  ): Promise<string | null> {
    try {
      // Extract metadata
      const metadata = await this.metadataExtractor.extractFileMetadata(file);

      // Check if file should be skipped based on filter
      if (
        !skipFilter &&
        !this.ruleMatcher.evaluateFilter(metadata, this.filter)
      ) {
        return null; // File is blocked by filter
      }

      // Find matching rule
      const matchingRule = this.ruleMatcher.findMatchingRule(
        metadata,
        this.rules
      );
      if (matchingRule) {
        return matchingRule.path;
      }

      // No rule matched - skip the file since only notes with rules should be moved
      return null;
    } catch (error) {
      handleError(
        error,
        `Error processing rules for file '${file.path}'`,
        false
      );
      return null;
    }
  }

  /**
   * Generates preview information for a single file without actually moving it
   */
  public async generatePreviewForFile(
    file: TFile,
    skipFilter = false
  ): Promise<PreviewEntry> {
    try {
      // Extract metadata
      const metadata = await this.metadataExtractor.extractFileMetadata(file);
      const { tags, fileName, filePath } = metadata;

      // Check filters first
      if (!skipFilter) {
        const filterDetails = this.ruleMatcher.getFilterMatchDetails(
          metadata,
          this.filter
        );
        if (!filterDetails.passes) {
          return {
            fileName,
            currentPath: filePath,
            targetPath: null,
            willBeMoved: false,
            blockReason: filterDetails.blockReason!,
            blockingFilter: filterDetails.blockingFilter!,
            tags,
          };
        }
      }

      // Check rules for matches
      const matchingRule = this.ruleMatcher.findMatchingRule(
        metadata,
        this.rules
      );
      if (matchingRule) {
        // Calculate the full target path
        const fullTargetPath = combinePath(matchingRule.path, fileName);

        // Check if file is already in the correct location
        if (filePath === fullTargetPath) {
          return {
            fileName,
            currentPath: filePath,
            targetPath: matchingRule.path,
            willBeMoved: false,
            blockReason: 'File is already in the correct folder',
            matchedRule: matchingRule.criteria,
            tags,
          };
        }

        return {
          fileName,
          currentPath: filePath,
          targetPath: matchingRule.path,
          willBeMoved: true,
          matchedRule: matchingRule.criteria,
          tags,
        };
      }

      // No rule matched - skip the file since only notes with rules should be moved
      return {
        fileName,
        currentPath: filePath,
        targetPath: null,
        willBeMoved: false,
        blockReason: 'No matching rule found',
        tags,
      };
    } catch (error) {
      handleError(
        error,
        `Error generating preview for file '${file.path}'`,
        false
      );
      return {
        fileName: file.name,
        currentPath: file.path,
        targetPath: null,
        willBeMoved: false,
        blockReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
        tags: [],
      };
    }
  }

  /**
   * Generates a complete move preview for multiple files
   */
  public async generateMovePreview(
    files: TFile[],
    enableRules: boolean,
    enableFilter: boolean
  ): Promise<MovePreview> {
    const successfulMoves: PreviewEntry[] = [];

    for (const file of files) {
      const preview = await this.generatePreviewForFile(file, !enableFilter);

      if (preview.willBeMoved) {
        successfulMoves.push(preview);
      }
      // Only include files that will be moved - blocked files are ignored
    }

    return {
      successfulMoves,
      totalFiles: files.length,
      settings: {
        isFilterWhitelist: false, // Always blacklist mode
      },
    };
  }
}
