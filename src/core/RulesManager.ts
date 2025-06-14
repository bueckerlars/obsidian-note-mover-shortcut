import { App, TFile } from "obsidian";
import { Rule, TagRule, GroupRule, Trigger } from "../settings/types";
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
            } else if (rule.type === 'group') {
                // Zuerst Subgruppen prüfen
                if (rule.subgroups && rule.subgroups.length > 0) {
                    const subgroupResult = await this.evaluateRules(rule.subgroups, tags, file);
                    if (subgroupResult) {
                        return subgroupResult;
                    }
                }
                // Dann Trigger der aktuellen Gruppe prüfen
                const matchingTrigger = await this.evaluateGroupTriggers(rule.triggers || [], tags, file, rule.groupType);
                if (matchingTrigger) {
                    return {
                        id: rule.id,
                        type: 'rule',
                        tag: matchingTrigger.tag,
                        path: rule.destination,
                        condition: matchingTrigger.conditions
                    };
                }
            }
        }
        return null;
    }

    /**
     * Evaluates triggers in a group
     */
    private async evaluateGroupTriggers(triggers: Trigger[], tags: string[], file: TFile, groupType: 'and' | 'or'): Promise<Trigger | null> {
        if (!triggers || triggers.length === 0) {
            return null;
        }

        if (groupType === 'and') {
            // For AND groups, all triggers must match
            for (const trigger of triggers) {
                if (!tags.includes(trigger.tag) || !await this.evaluateTriggerConditions(trigger, file)) {
                    return null;
                }
            }
            // If we get here, all triggers matched
            return triggers[0]; // Return the first trigger as they all matched
        } else {
            // For OR groups, any trigger can match
            for (const trigger of triggers) {
                if (tags.includes(trigger.tag) && await this.evaluateTriggerConditions(trigger, file)) {
                    return trigger;
                }
            }
            return null;
        }
    }

    /**
     * Evaluates conditions for a trigger
     */
    private async evaluateTriggerConditions(trigger: Trigger, file: TFile): Promise<boolean> {
        if (!trigger.conditions) return true;

        try {
            // Get file content
            let content: string;
            try {
                content = await this.app.vault.read(file);
            } catch (error) {
                console.error(`Error reading file ${file.path}:`, error);
                return false;
            }
            
            // Evaluate content condition
            if (trigger.conditions.contentCondition) {
                const { operator, text } = trigger.conditions.contentCondition;
                const contains = content.includes(text);
                if (operator === 'contains' && !contains) return false;
                if (operator === 'notContains' && contains) return false;
            }

            // Evaluate date condition
            if (trigger.conditions.dateCondition) {
                const { type, operator, days } = trigger.conditions.dateCondition;
                let fileStats;
                try {
                    fileStats = await this.app.vault.adapter.stat(file.path);
                } catch (error) {
                    console.error(`Error getting file stats for ${file.path}:`, error);
                    return false;
                }
                
                if (!fileStats) return false;

                const fileDate = type === 'created' ? fileStats.ctime : fileStats.mtime;
                const now = Date.now();
                const diffDays = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));

                if (operator === 'olderThan' && diffDays < days) return false;
                if (operator === 'newerThan' && diffDays > days) return false;
            }
            
            return true;
        } catch (error) {
            console.error(`Error evaluating trigger conditions for file ${file.path}:`, error);
            return false;
        }
    }

    /**
     * Evaluates conditions for a rule
     */
    private async evaluateConditions(rule: TagRule, file: TFile): Promise<boolean> {
        if (!rule.condition) return true;

        try {
            // Get file content
            let content: string;
            try {
                content = await this.app.vault.read(file);
            } catch (error) {
                console.error(`Error reading file ${file.path}:`, error);
                return false;
            }
            
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
                let fileStats;
                try {
                    fileStats = await this.app.vault.adapter.stat(file.path);
                } catch (error) {
                    console.error(`Error getting file stats for ${file.path}:`, error);
                    return false;
                }
                
                if (!fileStats) return false;

                const fileDate = type === 'created' ? fileStats.ctime : fileStats.mtime;
                const now = Date.now();
                const diffDays = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));

                if (operator === 'olderThan' && diffDays < days) return false;
                if (operator === 'newerThan' && diffDays > days) return false;
            }
            
            return true;
        } catch (error) {
            console.error(`Error evaluating conditions for file ${file.path}:`, error);
            return false;
        }
    }

    /**
     * Gets all tags from a file
     */
    getTagsFromFile(file: TFile): string[] {
        const fileCache = this.app.metadataCache.getFileCache(file);
        if (!fileCache) return [];
        return getAllTags(fileCache) || [];
    }
} 