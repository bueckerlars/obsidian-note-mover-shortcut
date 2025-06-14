import { App, TFile } from "obsidian";
import { Rule, TagRule } from "../settings/types";
import { getAllTags } from "../utils/tags";

export class RulesManager {
    constructor(private app: App) {}

    /**
     * Evaluates all rules against a file's tags and returns the first matching rule
     */
    async evaluateRules(rules: Rule[], tags: string[], file: TFile): Promise<TagRule | null> {
        for (const rule of rules) {
            if (rule.type === 'rule') {
                if (tags.includes(rule.tag)) {
                    // Check conditions
                    if (!rule.condition || await this.evaluateConditions(rule, file)) {
                        return rule;
                    }
                }
            } else {
                // Evaluate group rules
                const childResults = await Promise.all(
                    rule.rules.map((childRule: Rule) => this.evaluateRules([childRule], tags, file))
                );
                
                const matchingRules = childResults.filter((result): result is TagRule => result !== null);
                
                if (rule.type === 'and' && matchingRules.length === rule.rules.length) {
                    // For AND groups, return the first matching rule
                    return matchingRules[0];
                } else if (rule.type === 'or' && matchingRules.length > 0) {
                    // For OR groups, return the first matching rule
                    return matchingRules[0];
                }
            }
        }
        return null;
    }

    /**
     * Evaluates conditions for a rule
     */
    private async evaluateConditions(rule: TagRule, file: TFile): Promise<boolean> {
        if (!rule.condition) return true;

        // Get file content
        const content = await this.app.vault.read(file);
        
        // Evaluate content condition
        if (rule.condition.contentCondition) {
            const { operator, text } = rule.condition.contentCondition;
            const contains = content.includes(text);
            if (operator === 'contains' && !contains) return false;
            if (operator === 'notContains' && contains) return false;
        }

        // Evaluate date condition
        if (rule.condition.dateCondition) {
            const { type, operator, days } = rule.condition.dateCondition;
            const fileStats = await this.app.vault.adapter.stat(file.path);
            
            if (!fileStats) return false;

            const fileDate = type === 'created' ? fileStats.ctime : fileStats.mtime;
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - new Date(fileDate).getTime()) / (1000 * 60 * 60 * 24));

            if (operator === 'olderThan' && diffDays < days) return false;
            if (operator === 'newerThan' && diffDays > days) return false;
        }
        
        return true;
    }

    /**
     * Gets all tags from a file
     */
    getTagsFromFile(file: TFile): string[] {
        return getAllTags(this.app.metadataCache.getFileCache(file)!) || [];
    }
} 