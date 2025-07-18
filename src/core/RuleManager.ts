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
                            filterMatch = tags.some(tag => tag === value);
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

            // Find matching rule (weiterhin nur für Tags)
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