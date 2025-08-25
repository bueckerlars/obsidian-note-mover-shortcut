import { App, TFile } from 'obsidian';
import { getAllTags } from 'obsidian';
import { log_error } from '../utils/Log';
import { Rule } from '../types/Rule';

export class RuleManager {
    private rules: Rule[] = [];
    private filter: string[] = [];
    private isFilterWhitelist: boolean = false;

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

    public async moveFileBasedOnTags(file: TFile, skipFilter: boolean = false): Promise<string | null> {
        try {
            // Metadaten extrahieren
            const tags = getAllTags(this.app.metadataCache.getFileCache(file)!) || [];
            const fileName = file.name;
            const filePath = file.path;
            const createdAt = (file.stat && file.stat.ctime) ? new Date(file.stat.ctime) : null;
            const updatedAt = (file.stat && file.stat.mtime) ? new Date(file.stat.mtime) : null;
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
                }
                
                if (ruleMatch) {
                    return rule.path;
                }
            }

            return this.defaultFolder;
        } catch (error) {
            log_error(new Error(`Error processing rules for file '${file.path}': ${error.message}`));
            return null;
        }
    }
} 