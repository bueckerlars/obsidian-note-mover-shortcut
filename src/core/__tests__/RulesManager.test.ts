import { App, TFile } from "obsidian";
import { RulesManager } from "../RulesManager";
import { Rule, TagRule, GroupRule, Trigger } from "../../settings/types";
import { getAllTags } from "../../utils/tags";

jest.mock("../../utils/tags", () => ({
    getAllTags: jest.fn()
}));

describe("RulesManager", () => {
    let app: App;
    let rulesManager: RulesManager;
    let mockFile: TFile;

    beforeEach(() => {
        app = {
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

        rulesManager = new RulesManager(app);
        mockFile = {
            path: "test.md"
        } as TFile;

        (getAllTags as jest.Mock).mockReturnValue(["#test"]);
    });

    describe("evaluateRules", () => {
        it("should handle file read errors", async () => {
            const rules: Rule[] = [{
                type: "rule",
                id: "1",
                tag: "test",
                path: "/test",
                condition: {
                    contentCondition: {
                        operator: "contains",
                        text: "test"
                    }
                }
            }];

            (app.vault.read as jest.Mock).mockRejectedValue(new Error("Read error"));

            const result = await rulesManager.evaluateRules(rules, ["test"], mockFile);
            expect(result).toBeNull();
        });

        it("should handle file stat errors", async () => {
            const rules: Rule[] = [{
                type: "rule",
                id: "1",
                tag: "test",
                path: "/test",
                condition: {
                    dateCondition: {
                        type: "created",
                        operator: "olderThan",
                        days: 1
                    }
                }
            }];

            (app.vault.read as jest.Mock).mockResolvedValue("content");
            (app.vault.adapter.stat as jest.Mock).mockRejectedValue(new Error("Stat error"));

            const result = await rulesManager.evaluateRules(rules, ["test"], mockFile);
            expect(result).toBeNull();
        });

        it("should evaluate group rules with AND condition", async () => {
            const rules: GroupRule[] = [{
                type: "group",
                id: "1",
                groupType: "and",
                destination: "/test",
                triggers: [{
                    id: "1",
                    tag: "test1",
                    conditions: {
                        contentCondition: {
                            operator: "contains",
                            text: "test"
                        }
                    }
                }, {
                    id: "2",
                    tag: "test2",
                    conditions: {
                        contentCondition: {
                            operator: "contains",
                            text: "test"
                        }
                    }
                }]
            }];

            (app.vault.read as jest.Mock).mockResolvedValue("test content");
            (app.vault.adapter.stat as jest.Mock).mockResolvedValue({
                ctime: Date.now() - 2 * 24 * 60 * 60 * 1000,
                mtime: Date.now() - 2 * 24 * 60 * 60 * 1000
            });

            const result = await rulesManager.evaluateRules(rules, ["test1", "test2"], mockFile);
            expect(result).not.toBeNull();
            expect(result?.tag).toBe("test1");
        });

        it("should evaluate group rules with OR condition", async () => {
            const rules: GroupRule[] = [{
                type: "group",
                id: "1",
                groupType: "or",
                destination: "/test",
                triggers: [{
                    id: "1",
                    tag: "test1",
                    conditions: {
                        contentCondition: {
                            operator: "contains",
                            text: "test"
                        }
                    }
                }, {
                    id: "2",
                    tag: "test2",
                    conditions: {
                        contentCondition: {
                            operator: "contains",
                            text: "test"
                        }
                    }
                }]
            }];

            (app.vault.read as jest.Mock).mockResolvedValue("test content");
            (app.vault.adapter.stat as jest.Mock).mockResolvedValue({
                ctime: Date.now() - 2 * 24 * 60 * 60 * 1000,
                mtime: Date.now() - 2 * 24 * 60 * 60 * 1000
            });

            const result = await rulesManager.evaluateRules(rules, ["test1"], mockFile);
            expect(result).not.toBeNull();
            expect(result?.tag).toBe("test1");
        });
    });

    describe("evaluateGroupTriggers", () => {
        it("should handle trigger condition evaluation errors", async () => {
            const triggers: Trigger[] = [{
                id: "1",
                tag: "test",
                conditions: {
                    contentCondition: {
                        operator: "contains",
                        text: "test"
                    }
                }
            }];

            (app.vault.read as jest.Mock).mockRejectedValue(new Error("Read error"));

            const result = await (rulesManager as any).evaluateGroupTriggers(
                triggers,
                ["test"],
                mockFile,
                "and"
            );
            expect(result).toBeNull();
        });

        it("should handle empty triggers array", async () => {
            const result = await (rulesManager as any).evaluateGroupTriggers(
                [],
                ["test"],
                mockFile,
                "and"
            );
            expect(result).toBeNull();
        });
    });

    describe("evaluateConditions", () => {
        it("should handle condition evaluation errors", async () => {
            const rule: TagRule = {
                type: "rule",
                id: "1",
                tag: "test",
                path: "/test",
                condition: {
                    contentCondition: {
                        operator: "contains",
                        text: "test"
                    }
                }
            };

            (app.vault.read as jest.Mock).mockRejectedValue(new Error("Read error"));

            const result = await (rulesManager as any).evaluateConditions(rule, mockFile);
            expect(result).toBe(false);
        });

        it("should evaluate content conditions", async () => {
            const rule: TagRule = {
                type: "rule",
                id: "1",
                tag: "test",
                path: "/test",
                condition: {
                    contentCondition: {
                        operator: "contains",
                        text: "test"
                    }
                }
            };

            (app.vault.read as jest.Mock).mockResolvedValue("test content");

            const result = await (rulesManager as any).evaluateConditions(rule, mockFile);
            expect(result).toBe(true);
        });

        it("should evaluate date conditions", async () => {
            const rule: TagRule = {
                type: "rule",
                id: "1",
                tag: "test",
                path: "/test",
                condition: {
                    dateCondition: {
                        type: "created",
                        operator: "olderThan",
                        days: 1
                    }
                }
            };

            (app.vault.read as jest.Mock).mockResolvedValue("test content");
            (app.vault.adapter.stat as jest.Mock).mockResolvedValue({
                ctime: Date.now() - 2 * 24 * 60 * 60 * 1000,
                mtime: Date.now() - 2 * 24 * 60 * 60 * 1000
            });

            const result = await (rulesManager as any).evaluateConditions(rule, mockFile);
            expect(result).toBe(true);
        });
    });

    describe("getTagsFromFile", () => {
        it("should handle missing file cache", () => {
            (app.metadataCache.getFileCache as jest.Mock).mockReturnValue(null);
            const result = rulesManager.getTagsFromFile(mockFile);
            expect(result).toEqual([]);
        });

        it("should handle missing tags in file cache", () => {
            (app.metadataCache.getFileCache as jest.Mock).mockReturnValue({});
            (getAllTags as jest.Mock).mockReturnValue(null);
            const result = rulesManager.getTagsFromFile(mockFile);
            expect(result).toEqual([]);
        });

        it("should return tags from file cache", () => {
            (app.metadataCache.getFileCache as jest.Mock).mockReturnValue({
                tags: ["#test"]
            });
            (getAllTags as jest.Mock).mockReturnValue(["#test"]);
            const result = rulesManager.getTagsFromFile(mockFile);
            expect(result).toEqual(["#test"]);
        });
    });
}); 