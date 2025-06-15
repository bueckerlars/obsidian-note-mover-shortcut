import { App, TFile } from 'obsidian';
import { getAllTags } from 'obsidian';
import { log_error } from '../utils/Log';

export interface Rule {
    tag: string;
    path: string;
}

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

    public async moveFileBasedOnTags(file: TFile, skipFilter: boolean = false): Promise<string | null> {
        try {
            // Get tags from file
            const tags = getAllTags(this.app.metadataCache.getFileCache(file)!) || [];
            
            // Check if file should be skipped based on filter
            if (!skipFilter && tags.length > 0) {
                for (const tag of tags) {
                    const filterMatch = this.filter.find(filter => filter === tag);
                    if (!this.isFilterWhitelist && filterMatch) {
                        return null; // Skip if tag is in blacklist
                    }
                    if (this.isFilterWhitelist && !filterMatch) {
                        return null; // Skip if tag is not in whitelist
                    }
                }
            }

            // Find matching rule
            for (const tag of tags) {
                const rule = this.rules.find(rule => rule.tag === tag);
                if (rule) {
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