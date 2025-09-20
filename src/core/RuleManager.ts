import { App, TFile } from 'obsidian';
import { getAllTags } from 'obsidian';
import { NoticeManager } from '../utils/NoticeManager';
import { Rule } from '../types/Rule';
import { PreviewEntry, MovePreview } from '../types/MovePreview';
import { createError, handleError } from '../utils/Error';

export class RuleManager {
    private rules: Rule[] = [];
    private filter: string[] = [];
    private isFilterWhitelist: boolean = false;
    private onlyMoveNotesWithRules: boolean = false;

    constructor(
        private app: App,
        private defaultFolder: string
    ) {}

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

    /**
     * Matches tags hierarchically:
     * - Exact match has highest priority
     * - Parent tag matches all subtags (e.g., #food matches #food/recipes)
     */
    private matchTag(fileTags: string[], ruleTag: string): boolean {
        // First check for exact match
        if (fileTags.includes(ruleTag)) {
            return true;
        }

        // Then check if any file tag is a subtag of the rule tag
        // Rule: #food should match #food/recipes, #food/breakfast, etc.
        return fileTags.some(fileTag => {
            if (fileTag.startsWith(ruleTag + '/')) {
                return true;
            }
            return false;
        });
    }

    /**
     * Matches properties from frontmatter:
     * - Format: "key:value" for exact value match
     * - Format: "key" for existence check (any value)
     */
    private matchProperty(properties: Record<string, any>, criteria: string): boolean {
        // Check if criteria contains a colon to separate key and value
        const colonIndex = criteria.indexOf(':');
        
        if (colonIndex === -1) {
            // Format: "key" - check if property exists
            const key = criteria.trim();
            return properties.hasOwnProperty(key) && properties[key] !== undefined && properties[key] !== null;
        } else {
            // Format: "key:value" - check for exact value match
            const key = criteria.substring(0, colonIndex).trim();
            const expectedValue = criteria.substring(colonIndex + 1).trim();
            
            if (!properties.hasOwnProperty(key)) {
                return false;
            }
            
            const actualValue = properties[key];
            
            // Handle different value types
            if (actualValue === null || actualValue === undefined) {
                return false;
            }
            
            // Convert both to strings for comparison to handle different types
            const actualValueStr = String(actualValue).toLowerCase();
            const expectedValueStr = expectedValue.toLowerCase();
            
            return actualValueStr === expectedValueStr;
        }
    }

    public async moveFileBasedOnTags(file: TFile, skipFilter: boolean = false): Promise<string | null> {
        try {
            // Metadaten extrahieren
            const fileCache = this.app.metadataCache.getFileCache(file)!;
            const tags = getAllTags(fileCache) || [];
            const fileName = file.name;
            const filePath = file.path;
            const createdAt = (file.stat && file.stat.ctime) ? new Date(file.stat.ctime) : null;
            const updatedAt = (file.stat && file.stat.mtime) ? new Date(file.stat.mtime) : null;
            const properties = fileCache.frontmatter || {};
            // Inhalt könnte optional geladen werden
            let fileContent = "";
            try {
                fileContent = await this.app.vault.read(file);
            } catch {}

            // Check if file should be skipped based on filter
            if (!skipFilter && this.filter.length > 0) {
                for (const filterStr of this.filter) {
                    // Filter-String parsen: typ: value
                    const match = filterStr.match(/^([a-zA-Z_]+):\s*(.*)$/);
                    if (!match) continue;
                    const type = match[1];
                    const value = match[2];
                    let filterMatch = false;
                    switch (type) {
                        case "tag":
                            filterMatch = this.matchTag(tags, value);
                            break;
                        case "fileName":
                            filterMatch = fileName === value;
                            break;
                        case "path":
                            filterMatch = filePath === value;
                            break;
                        case "content":
                            filterMatch = fileContent.includes(value);
                            break;
                        case "created_at":
                            if (createdAt) filterMatch = createdAt.toISOString().startsWith(value);
                            break;
                        case "updated_at":
                            if (updatedAt) filterMatch = updatedAt.toISOString().startsWith(value);
                            break;
                        case "property":
                            filterMatch = this.matchProperty(properties, value);
                            break;
                    }
                    if (!this.isFilterWhitelist && filterMatch) {
                        return null; // Skip if match in blacklist
                    }
                    if (this.isFilterWhitelist && !filterMatch) {
                        return null; // Skip if not match in whitelist
                    }
                }
            }

            // Sort rules by tag specificity (most specific first)
            const sortedRules = this.rules.slice().sort((a, b) => {
                const aMatch = a.criteria.match(/^tag:\s*(.*)$/);
                const bMatch = b.criteria.match(/^tag:\s*(.*)$/);
                
                if (aMatch && bMatch) {
                    // Count the number of subtag levels (slashes)
                    const aLevels = (aMatch[1].match(/\//g) || []).length;
                    const bLevels = (bMatch[1].match(/\//g) || []).length;
                    return bLevels - aLevels; // More specific (more slashes) first
                }
                return 0; // Keep original order for non-tag rules
            });

            // Find matching rule (jetzt für alle Kriterien-Typen)
            for (const rule of sortedRules) {
                // Rule-String parsen: typ: value
                const match = rule.criteria.match(/^([a-zA-Z_]+):\s*(.*)$/);
                if (!match) continue;
                
                const type = match[1];
                const value = match[2];
                let ruleMatch = false;
                
                switch (type) {
                    case "tag":
                        ruleMatch = this.matchTag(tags, value);
                        break;
                    case "fileName":
                        ruleMatch = fileName === value;
                        break;
                    case "path":
                        ruleMatch = filePath === value;
                        break;
                    case "content":
                        ruleMatch = fileContent.includes(value);
                        break;
                    case "created_at":
                        if (createdAt) ruleMatch = createdAt.toISOString().startsWith(value);
                        break;
                    case "updated_at":
                        if (updatedAt) ruleMatch = updatedAt.toISOString().startsWith(value);
                        break;
                    case "property":
                        ruleMatch = this.matchProperty(properties, value);
                        break;
                }
                
                if (ruleMatch) {
                    return rule.path;
                }
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
            // Extract metadata (same as in moveFileBasedOnTags)
            const fileCache = this.app.metadataCache.getFileCache(file);
            const tags = getAllTags(fileCache || {}) || [];
            const fileName = file.name;
            const filePath = file.path;
            const createdAt = (file.stat && file.stat.ctime) ? new Date(file.stat.ctime) : null;
            const updatedAt = (file.stat && file.stat.mtime) ? new Date(file.stat.mtime) : null;
            const properties = fileCache?.frontmatter || {};
            
            let fileContent = "";
            try {
                fileContent = await this.app.vault.read(file);
            } catch {}

            // Check filters first
            if (!skipFilter && this.filter.length > 0) {
                for (const filterStr of this.filter) {
                    const match = filterStr.match(/^([a-zA-Z_]+):\s*(.*)$/);
                    if (!match) continue;
                    
                    const type = match[1];
                    const value = match[2];
                    let filterMatch = false;
                    
                    switch (type) {
                        case "tag":
                            filterMatch = this.matchTag(tags, value);
                            break;
                        case "fileName":
                            filterMatch = fileName === value;
                            break;
                        case "path":
                            filterMatch = filePath === value;
                            break;
                        case "content":
                            filterMatch = fileContent.includes(value);
                            break;
                        case "created_at":
                            if (createdAt) filterMatch = createdAt.toISOString().startsWith(value);
                            break;
                        case "updated_at":
                            if (updatedAt) filterMatch = updatedAt.toISOString().startsWith(value);
                            break;
                        case "property":
                            filterMatch = this.matchProperty(properties, value);
                            break;
                    }
                    
                    if (!this.isFilterWhitelist && filterMatch) {
                        return {
                            fileName,
                            currentPath: filePath,
                            targetPath: null,
                            willBeMoved: false,
                            blockReason: this.isFilterWhitelist ? "Not in whitelist" : "Blocked by blacklist filter",
                            blockingFilter: `${type}: ${value}`,
                            tags
                        };
                    }
                    
                    if (this.isFilterWhitelist && !filterMatch) {
                        return {
                            fileName,
                            currentPath: filePath,
                            targetPath: null,
                            willBeMoved: false,
                            blockReason: "Not in whitelist",
                            blockingFilter: `${type}: ${value}`,
                            tags
                        };
                    }
                }
            }

            // Sort rules by specificity
            const sortedRules = this.rules.slice().sort((a, b) => {
                const aMatch = a.criteria.match(/^tag:\s*(.*)$/);
                const bMatch = b.criteria.match(/^tag:\s*(.*)$/);
                
                if (aMatch && bMatch) {
                    const aLevels = (aMatch[1].match(/\//g) || []).length;
                    const bLevels = (bMatch[1].match(/\//g) || []).length;
                    return bLevels - aLevels;
                }
                return 0;
            });

            // Check rules for matches
            for (const rule of sortedRules) {
                const match = rule.criteria.match(/^([a-zA-Z_]+):\s*(.*)$/);
                if (!match) continue;
                
                const type = match[1];
                const value = match[2];
                let ruleMatch = false;
                
                switch (type) {
                    case "tag":
                        ruleMatch = this.matchTag(tags, value);
                        break;
                    case "fileName":
                        ruleMatch = fileName === value;
                        break;
                    case "path":
                        ruleMatch = filePath === value;
                        break;
                    case "content":
                        ruleMatch = fileContent.includes(value);
                        break;
                    case "created_at":
                        if (createdAt) ruleMatch = createdAt.toISOString().startsWith(value);
                        break;
                    case "updated_at":
                        if (updatedAt) ruleMatch = updatedAt.toISOString().startsWith(value);
                        break;
                    case "property":
                        ruleMatch = this.matchProperty(properties, value);
                        break;
                }
                
                if (ruleMatch) {
                    return {
                        fileName,
                        currentPath: filePath,
                        targetPath: rule.path,
                        willBeMoved: true,
                        matchedRule: rule.criteria,
                        tags
                    };
                }
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