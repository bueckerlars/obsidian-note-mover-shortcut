import { App, TFile } from 'obsidian';
import { RuleV2 } from '../types/RuleV2';
import { PreviewEntry, MovePreview } from '../types/MovePreview';
import { handleError } from '../utils/Error';
import {
  combinePath,
  DESTINATION_PATH_BLOCK_REASONS,
  formatPath,
  normalizeDestinationFolderPath,
} from '../utils/PathUtils';
import { MetadataExtractor } from './MetadataExtractor';
import { RuleMatcherV2 } from './RuleMatcherV2';
import { BlacklistFilterEngine } from '../domain/filters/blacklist-filter-engine';
import { filtersNeedContent } from '../domain/filters/filter-needs-content';
import {
  DestinationTemplateContext,
  renderDestinationTemplate,
} from '../domain/templates/DestinationTemplate';
import type { PerformanceTraceRecorder } from '../infrastructure/debug/performance-trace';

/**
 * RuleManager for Rule V2 system
 *
 * Provides rule-based file movement using the new Trigger-based system
 * with aggregation support and type-safe operator evaluation.
 *
 * @since 0.5.0
 */
/**
 * Result of resolving a file against the rules: the destination folder plus
 * whether a missing destination folder should be created for this move.
 */
export interface RuleMoveResult {
  destination: string;
  createFolder: boolean;
}

export class RuleManagerV2 {
  private rules: RuleV2[] = [];
  private filter: string[] = []; // Filter remain V1-compatible
  private createMissingFolders = true;
  private metadataExtractor: MetadataExtractor;
  private ruleMatcherV2: RuleMatcherV2;
  private readonly filterEngine = new BlacklistFilterEngine();

  constructor(
    private app: App,
    private defaultFolder: string,
    private readonly perf: PerformanceTraceRecorder
  ) {
    this.metadataExtractor = new MetadataExtractor(app);
    this.ruleMatcherV2 = new RuleMatcherV2();
  }

  /**
   * Sets the rules for this manager
   *
   * @param rules - Array of RuleV2 rules
   */
  public setRules(rules: RuleV2[]): void {
    this.rules = rules;
    this.ruleMatcherV2.warmRegexCacheFromRules(rules);
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
   * Sets the global default for creating missing destination folders.
   * Individual rules can override this via `RuleV2.createDestinationFolder`.
   *
   * @param createMissingFolders - Whether missing folders are created by default
   */
  public setCreateMissingFolders(createMissingFolders: boolean): void {
    this.createMissingFolders = createMissingFolders;
  }

  /**
   * Resolves the effective "create destination folder" decision for a rule,
   * honoring the per-rule override and falling back to the global default.
   */
  private resolveCreateFolder(rule: RuleV2): boolean {
    return rule.createDestinationFolder ?? this.createMissingFolders;
  }

  private filterNeedsContent(): boolean {
    return filtersNeedContent(this.filter);
  }

  /**
   * Processes a single file against rules and filters
   *
   * This method evaluates ONLY the specified file against the configured
   * rules and filters. It does NOT scan the entire vault.
   *
   * @param file - The specific TFile to evaluate
   * @param skipFilter - Whether to skip filter evaluation
   * @returns Move result with destination and folder-creation decision, or null
   */
  public async moveFileBasedOnTags(
    file: TFile,
    skipFilter = false
  ): Promise<RuleMoveResult | null> {
    return this.perf.recordAsync(
      'RuleManagerV2.moveFileBasedOnTags',
      async () => {
        try {
          const metadata = await this.metadataExtractor.extractFileMetadataV2(
            file,
            this.filterNeedsContent()
          );

          if (
            !skipFilter &&
            !this.filterEngine.evaluateFilter(metadata, this.filter)
          ) {
            return null; // File is blocked by filter
          }

          // Find matching rule using V2 logic
          const matchingRule = this.ruleMatcherV2.findMatchingRule(
            metadata,
            this.rules
          );

          if (matchingRule) {
            const rendered = this.resolveDestinationTemplate(
              matchingRule.destination,
              metadata
            );

            const normalized = this.normalizeRenderedDestination(rendered);
            if (!normalized.ok) {
              return null;
            }

            return {
              destination: normalized.path,
              createFolder: this.resolveCreateFolder(matchingRule),
            };
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
      },
      { path: file.path, skipFilter }
    );
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
      const metadata = await this.metadataExtractor.extractFileMetadataV2(
        file,
        this.filterNeedsContent()
      );
      const { tags, fileName, filePath } = metadata;

      // Check filters first (using V1 logic)
      if (!skipFilter) {
        const filterDetails = this.filterEngine.getFilterMatchDetails(
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
        const rendered = this.resolveDestinationTemplate(
          matchingRule.destination,
          metadata
        );

        const normalized = this.normalizeRenderedDestination(rendered);
        if (!normalized.ok) {
          return {
            fileName,
            currentPath: filePath,
            targetPath: null,
            willBeMoved: false,
            blockReason: normalized.reason,
            matchedRule: matchingRule.name,
            tags,
          };
        }

        const targetFolder = normalized.path;
        const createFolder = this.resolveCreateFolder(matchingRule);

        // Calculate the full target path
        const fullTargetPath = combinePath(targetFolder, fileName);

        // Check if file is already in the correct location
        if (filePath === fullTargetPath) {
          return {
            fileName,
            currentPath: filePath,
            targetPath: targetFolder,
            willBeMoved: false,
            blockReason: 'File is already in the correct folder',
            matchedRule: matchingRule.name,
            createFolder,
            tags,
          };
        }

        // When auto-create is disabled and the destination folder does not
        // exist yet, the move would be skipped - reflect that in the preview.
        if (!createFolder && !this.destinationFolderExists(targetFolder)) {
          return {
            fileName,
            currentPath: filePath,
            targetPath: targetFolder,
            willBeMoved: false,
            blockReason:
              'Destination folder does not exist and auto-create is disabled',
            matchedRule: matchingRule.name,
            createFolder,
            tags,
          };
        }

        return {
          fileName,
          currentPath: filePath,
          targetPath: targetFolder,
          willBeMoved: true,
          matchedRule: matchingRule.name,
          createFolder,
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
    return this.perf.recordAsync(
      'RuleManagerV2.generateMovePreview',
      async () => {
        const successfulMoves: PreviewEntry[] = [];

        for (const file of files) {
          const preview = await this.generatePreviewForFile(
            file,
            !enableFilter
          );

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
      },
      { fileCount: files.length, enableRules, enableFilter }
    );
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

  /**
   * Resolves a destination string that may contain template placeholders.
   *
   * If the destination does not contain any template markers, the original
   * string is returned. In case of template parse errors, the raw destination
   * is used as a safe fallback.
   */
  /**
   * Applies the same destination normalization for move and preview so both agree.
   */
  /**
   * Synchronous existence check for a destination folder, used during preview
   * generation. Root always counts as existing.
   */
  private destinationFolderExists(folderPath: string): boolean {
    if (!folderPath || folderPath === '/' || folderPath === '') {
      return true;
    }
    const formatted = formatPath(folderPath);
    if (!formatted) {
      return true;
    }
    return this.app.vault.getAbstractFileByPath(formatted) !== null;
  }

  private normalizeRenderedDestination(
    rendered: string
  ): { ok: true; path: string } | { ok: false; reason: string } {
    if (!rendered || rendered.trim() === '') {
      return {
        ok: false,
        reason: DESTINATION_PATH_BLOCK_REASONS.emptyAfterResolve,
      };
    }
    return normalizeDestinationFolderPath(rendered);
  }

  private resolveDestinationTemplate(
    destination: string,
    metadata: Awaited<ReturnType<MetadataExtractor['extractFileMetadataV2']>>
  ): string {
    if (!destination) {
      return destination;
    }

    if (!destination.includes('{{')) {
      return destination;
    }

    const context: DestinationTemplateContext = {
      tags: metadata.tags,
      properties: metadata.properties,
    };

    try {
      const rendered = renderDestinationTemplate(destination, context);

      // If all placeholders failed to resolve, the rendered value may be an
      // empty string. Callers treat an empty string as "no valid destination".
      return rendered;
    } catch {
      // Fail safe and fall back to the raw destination
      return destination;
    }
  }
}
