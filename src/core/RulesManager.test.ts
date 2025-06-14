import { App, TFile } from "obsidian";
import { RulesManager } from "./RulesManager";
import { Rule, TagRule, GroupRule, Trigger } from "../settings/types";

describe("RulesManager", () => {
    let rulesManager: RulesManager;
    let mockApp: App;
    let mockFile: TFile;

    beforeEach(() => {
        mockApp = {
            vault: {
                read: jest.fn(),
                adapter: {
                    stat: jest.fn()
                }
            },
            metadataCache: {
                getFileCache: jest.fn()
            }
        } as unknown as App;

        mockFile = {
            path: "test.md"
        } as TFile;

        rulesManager = new RulesManager(mockApp);
    });

    describe("evaluateRules", () => {
        it("should return null when no rules match", async () => {
            const rules: Rule[] = [];
            const tags = ["#test"];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });

        it("should match a simple tag rule", async () => {
            const rule: TagRule = {
                id: "1",
                type: "rule",
                tag: "#test",
                path: "/test"
            };
            const rules: Rule[] = [rule];
            const tags = ["#test"];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual(rule);
        });

        it("should not match when tag is not present", async () => {
            const rule: TagRule = {
                id: "1",
                type: "rule",
                tag: "#test",
                path: "/test"
            };
            const rules: Rule[] = [rule];
            const tags = ["#other"];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });

        it("should evaluate content condition", async () => {
            const rule: TagRule = {
                id: "1",
                type: "rule",
                tag: "#test",
                path: "/test",
                condition: {
                    contentCondition: {
                        operator: "contains",
                        text: "test content"
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ["#test"];
            
            (mockApp.vault.read as jest.Mock).mockResolvedValue("test content");
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual(rule);
        });

        it("should evaluate date condition", async () => {
            const rule: TagRule = {
                id: "1",
                type: "rule",
                tag: "#test",
                path: "/test",
                condition: {
                    dateCondition: {
                        type: "created",
                        operator: "olderThan",
                        days: 7
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ["#test"];
            
            const oldDate = Date.now() - 8 * 24 * 60 * 60 * 1000;
            (mockApp.vault.adapter.stat as jest.Mock).mockResolvedValue({
                ctime: oldDate
            });
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual(rule);
        });

        it("should evaluate group rules with AND condition", async () => {
            const groupRule: GroupRule = {
                id: "1",
                type: "group",
                groupType: "and",
                destination: "/test",
                triggers: [
                    { id: "trigger1", tag: "#test1", conditions: undefined },
                    { id: "trigger2", tag: "#test2", conditions: undefined }
                ]
            };
            const rules: Rule[] = [groupRule];
            const tags = ["#test1", "#test2"];
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual({
                id: "1",
                type: "rule",
                tag: "#test1",
                path: "/test",
                condition: null
            });
        });

        it("should evaluate group rules with OR condition", async () => {
            const groupRule: GroupRule = {
                id: "1",
                type: "group",
                groupType: "or",
                destination: "/test",
                triggers: [
                    { id: "trigger1", tag: "#test1", conditions: undefined },
                    { id: "trigger2", tag: "#test2", conditions: undefined }
                ]
            };
            const rules: Rule[] = [groupRule];
            const tags = ["#test1"];
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual({
                id: "1",
                type: "rule",
                tag: "#test1",
                path: "/test",
                condition: null
            });
        });

        it("should handle file read errors gracefully", async () => {
            const rule: TagRule = {
                id: "1",
                type: "rule",
                tag: "#test",
                path: "/test",
                condition: {
                    contentCondition: {
                        operator: "contains",
                        text: "test content"
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ["#test"];
            
            (mockApp.vault.read as jest.Mock).mockRejectedValue(new Error("File read error"));
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });

        it("should handle file stat errors gracefully", async () => {
            const rule: TagRule = {
                id: "1",
                type: "rule",
                tag: "#test",
                path: "/test",
                condition: {
                    dateCondition: {
                        type: "created",
                        operator: "olderThan",
                        days: 7
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ["#test"];
            
            (mockApp.vault.adapter.stat as jest.Mock).mockRejectedValue(new Error("Stat error"));
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });

        it("should handle nested group rules", async () => {
            const nestedGroupRule: GroupRule = {
                id: "1",
                type: "group",
                groupType: "and",
                destination: "/test",
                subgroups: [{
                    id: "2",
                    type: "group",
                    groupType: "or",
                    destination: "/subtest",
                    triggers: [
                        { id: "trigger1", tag: "#test1", conditions: undefined },
                        { id: "trigger2", tag: "#test2", conditions: undefined }
                    ]
                }],
                triggers: []
            };
            const rules: Rule[] = [nestedGroupRule];
            const tags = ["#test1"];
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual({
                id: "2",
                type: "rule",
                tag: "#test1",
                path: "/subtest",
                condition: undefined
            });
        });

        it("should handle notContains content condition", async () => {
            const rule: TagRule = {
                id: "1",
                type: "rule",
                tag: "#test",
                path: "/test",
                condition: {
                    contentCondition: {
                        operator: "notContains",
                        text: "forbidden content"
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ["#test"];
            
            (mockApp.vault.read as jest.Mock).mockResolvedValue("allowed content");
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual(rule);
        });

        it("should handle newerThan date condition", async () => {
            const rule: TagRule = {
                id: "1",
                type: "rule",
                tag: "#test",
                path: "/test",
                condition: {
                    dateCondition: {
                        type: "modified",
                        operator: "newerThan",
                        days: 7
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ["#test"];
            
            const recentDate = Date.now() - 3 * 24 * 60 * 60 * 1000;
            (mockApp.vault.adapter.stat as jest.Mock).mockResolvedValue({
                mtime: recentDate
            });
            
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual(rule);
        });
    });

    describe("getTagsFromFile", () => {
        it("should return tags from file cache", () => {
            const mockTags = ["#test1", "#test2"];
            (mockApp.metadataCache.getFileCache as jest.Mock).mockReturnValue({
                tags: mockTags.map(tag => ({ tag }))
            });

            const result = rulesManager.getTagsFromFile(mockFile);
            expect(result).toEqual(mockTags);
        });

        it("should return empty array when no tags are present", () => {
            (mockApp.metadataCache.getFileCache as jest.Mock).mockReturnValue({
                tags: []
            });

            const result = rulesManager.getTagsFromFile(mockFile);
            expect(result).toEqual([]);
        });
    });
}); 