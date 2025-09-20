import { App, TFile } from 'obsidian';
import { NoticeManager } from '../utils/NoticeManager';
import { Rule } from '../types/Rule';
import { PreviewEntry, MovePreview } from '../types/MovePreview';
import { createError, handleError } from '../utils/Error';
import { MetadataExtractor } from './MetadataExtractor';
import { RuleMatcher } from './RuleMatcher';

export class RuleManager {
    private rules: Rule[] = [];
    private filter: string[] = [];
    private isFilterWhitelist: boolean = false;
    private onlyMoveNotesWithRules: boolean = false;
    private metadataExtractor: MetadataExtractor;
    private ruleMatcher: RuleMatcher;

    constructor(
        private app: App,
        private defaultFolder: string
    ) {
        this.metadataExtractor = new MetadataExtractor(app);
        this.ruleMatcher = new RuleMatcher();
    }

    public setRules(rules: Rule[]): void {
        this.rules = rules;
    }

    public setFilter(filter: string[], isWhitelist: boolean): void {
        this.filter = filter;
        this.isFilterWhitelist = isWhitelist;
    }

    public setOnlyMoveNotesWithRules(onlyMoveNotesWithRules: boolean): void {
        this.onlyMoveNotesWithRules = onlyMoveNotesWithRules;
    }


    public async moveFileBasedOnTags(file: TFile, skipFilter: boolean = false): Promise<string | null> {
        try {
            // Extract metadata
            const metadata = await this.metadataExtractor.extractFileMetadata(file);

            // Check if file should be skipped based on filter
            if (!skipFilter && !this.ruleMatcher.evaluateFilter(metadata, this.filter, this.isFilterWhitelist)) {
                return null; // File is blocked by filter
            }

            // Find matching rule
            const matchingRule = this.ruleMatcher.findMatchingRule(metadata, this.rules);
            if (matchingRule) {
                return matchingRule.path;
            }

            // If onlyMoveNotesWithRules is enabled and no rule matched, return null to skip the file
            if (this.onlyMoveNotesWithRules) {
                return null;
            }

            return this.defaultFolder;
        } catch (error) {
            handleError(error, `Error processing rules for file '${file.path}'`, false);
            return null;
        }
    }

    /**
     * Generates preview information for a single file without actually moving it
     */
    public async generatePreviewForFile(file: TFile, skipFilter: boolean = false): Promise<PreviewEntry> {
        try {
            // Extract metadata
            const metadata = await this.metadataExtractor.extractFileMetadata(file);
            const { tags, fileName, filePath } = metadata;

            // Check filters first
            if (!skipFilter) {
                const filterDetails = this.ruleMatcher.getFilterMatchDetails(metadata, this.filter, this.isFilterWhitelist);
                if (!filterDetails.passes) {
                    return {
                        fileName,
                        currentPath: filePath,
                        targetPath: null,
                        willBeMoved: false,
                        blockReason: filterDetails.blockReason!,
                        blockingFilter: filterDetails.blockingFilter!,
                        tags
                    };
                }
            }

            // Check rules for matches
            const matchingRule = this.ruleMatcher.findMatchingRule(metadata, this.rules);
            if (matchingRule) {
                return {
                    fileName,
                    currentPath: filePath,
                    targetPath: matchingRule.path,
                    willBeMoved: true,
                    matchedRule: matchingRule.criteria,
                    tags
                };
            }

            // No rule matched
            if (this.onlyMoveNotesWithRules) {
                return {
                    fileName,
                    currentPath: filePath,
                    targetPath: null,
                    willBeMoved: false,
                    blockReason: "No matching rule found",
                    tags
                };
            } else {
                return {
                    fileName,
                    currentPath: filePath,
                    targetPath: this.defaultFolder,
                    willBeMoved: true,
                    matchedRule: "Default destination",
                    tags
                };
            }

        } catch (error) {
            handleError(error, `Error generating preview for file '${file.path}'`, false);
            return {
                fileName: file.name,
                currentPath: file.path,
                targetPath: null,
                willBeMoved: false,
                blockReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
                tags: []
            };
        }
    }

    /**
     * Generates a complete move preview for multiple files
     */
    public async generateMovePreview(files: TFile[], enableRules: boolean, enableFilter: boolean, isFilterWhitelist: boolean): Promise<MovePreview> {
        const successfulMoves: PreviewEntry[] = [];
        const blockedMoves: PreviewEntry[] = [];

        for (const file of files) {
            const preview = await this.generatePreviewForFile(file, !enableFilter);
            
            if (preview.willBeMoved) {
                successfulMoves.push(preview);
            } else {
                blockedMoves.push(preview);
            }
        }

        return {
            successfulMoves,
            blockedMoves,
            totalFiles: files.length,
            settings: {
                enableRules,
                enableFilter,
                isFilterWhitelist,
                defaultDestination: this.defaultFolder
            }
        };
    }
} 