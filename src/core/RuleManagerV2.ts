import { App, TFile } from 'obsidian';
import { NoticeManager } from '../utils/NoticeManager';
import { RuleV2 } from '../types/RuleV2';
import { PreviewEntry, MovePreview } from '../types/MovePreview';
import { createError, handleError } from '../utils/Error';
import { combinePath } from '../utils/PathUtils';
import { MetadataExtractor } from './MetadataExtractor';
import { RuleMatcherV2 } from './RuleMatcherV2';
import { RuleMatcher } from './RuleMatcher';

/**
 * RuleManager for Rule V2 system
 *
 * Provides rule-based file movement using the new Trigger-based system
 * with aggregation support and type-safe operator evaluation.
 *
 * @since 0.5.0
 */
export class RuleManagerV2 {
  private rules: RuleV2[] = [];
  private filter: string[] = []; // Filter remain V1-compatible
  private metadataExtractor: MetadataExtractor;
  private ruleMatcherV2: RuleMatcherV2;
  private ruleMatcherV1: RuleMatcher; // For filter evaluation

  constructor(
    private app: App,
    private defaultFolder: string
  ) {
    this.metadataExtractor = new MetadataExtractor(app);
    this.ruleMatcherV2 = new RuleMatcherV2(this.metadataExtractor);
    this.ruleMatcherV1 = new RuleMatcher(this.metadataExtractor);
  }

  /**
   * Sets the rules for this manager
   *
   * @param rules - Array of RuleV2 rules
   */
  public setRules(rules: RuleV2[]): void {
    this.rules = rules;
  }

  /**
   * Sets the filter for this manager
   * Filter logic remains V1-compatible
   *
   * @param filter - Array of filter criteria strings
   */
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
      // Extract V2 metadata
      const metadata = await this.metadataExtractor.extractFileMetadataV2(file);

      // Check if file should be skipped based on filter (using V1 logic)
      if (
        !skipFilter &&
        !this.ruleMatcherV1.evaluateFilter(metadata, this.filter)
      ) {
        return null; // File is blocked by filter
      }

      // Find matching rule using V2 logic
      const matchingRule = this.ruleMatcherV2.findMatchingRule(
        metadata,
        this.rules
      );

      if (matchingRule) {
        return matchingRule.destination;
      }

      // No rule matched - skip the file since only notes with rules should be moved
      return null;
    } catch (error) {
      handleError(
        error,
        `Error processing V2 rules for file '${file.path}'`,
        false
      );
      return null;
    }
  }

  /**
   * Generates preview information for a single file without actually moving it
   *
   * @param file - TFile to generate preview for
   * @param skipFilter - Whether to skip filter evaluation
   * @returns PreviewEntry with move information
   */
  public async generatePreviewForFile(
    file: TFile,
    skipFilter = false
  ): Promise<PreviewEntry> {
    try {
      // Extract V2 metadata
      const metadata = await this.metadataExtractor.extractFileMetadataV2(file);
      const { tags, fileName, filePath } = metadata;

      // Check filters first (using V1 logic)
      if (!skipFilter) {
        const filterDetails = this.ruleMatcherV1.getFilterMatchDetails(
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

      // Check rules for matches using V2 logic
      const matchingRule = this.ruleMatcherV2.findMatchingRule(
        metadata,
        this.rules
      );

      if (matchingRule) {
        // Calculate the full target path
        const fullTargetPath = combinePath(matchingRule.destination, fileName);

        // Check if file is already in the correct location
        if (filePath === fullTargetPath) {
          return {
            fileName,
            currentPath: filePath,
            targetPath: matchingRule.destination,
            willBeMoved: false,
            blockReason: 'File is already in the correct folder',
            matchedRule: matchingRule.name,
            tags,
          };
        }

        return {
          fileName,
          currentPath: filePath,
          targetPath: matchingRule.destination,
          willBeMoved: true,
          matchedRule: matchingRule.name,
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
        `Error generating V2 preview for file '${file.path}'`,
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
   *
   * @param files - Array of TFiles to preview
   * @param enableRules - Whether to enable rule evaluation
   * @param enableFilter - Whether to enable filter evaluation
   * @returns MovePreview with all move information
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

  /**
   * Gets the number of active rules
   *
   * @returns Number of active rules
   */
  public getActiveRuleCount(): number {
    return this.rules.filter(rule => rule.active).length;
  }

  /**
   * Gets the number of total rules
   *
   * @returns Number of total rules
   */
  public getTotalRuleCount(): number {
    return this.rules.length;
  }

  /**
   * Validates that all rules have valid triggers
   *
   * @returns Array of validation errors
   */
  public validateRules(): string[] {
    const errors: string[] = [];

    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];

      if (rule.active && rule.triggers.length === 0) {
        errors.push(
          `Rule "${rule.name}" (index ${i}) is active but has no triggers`
        );
      }

      if (!rule.name || rule.name.trim() === '') {
        errors.push(`Rule at index ${i} has no name`);
      }

      if (!rule.destination || rule.destination.trim() === '') {
        errors.push(`Rule "${rule.name}" has no destination`);
      }
    }

    return errors;
  }
}
