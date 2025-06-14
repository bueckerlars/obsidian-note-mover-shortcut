import { App, TFile } from "obsidian";
import { RulesManager } from "../core/RulesManager";
import { Rule, TagRule, GroupRule, Trigger } from "../settings/types";

describe('RulesManager', () => {
    let rulesManager: RulesManager;
    let mockApp: App;
    let mockFile: TFile;
    let mockVault: any;
    let mockMetadataCache: any;

    beforeEach(() => {
        // Mock App
        mockVault = {
            read: jest.fn(),
            adapter: {
                stat: jest.fn()
            }
        };

        mockMetadataCache = {
            getFileCache: jest.fn()
        };

        mockApp = {
            vault: mockVault,
            metadataCache: mockMetadataCache
        } as unknown as App;

        // Mock TFile
        mockFile = {
            path: 'test.md',
            basename: 'test'
        } as TFile;

        rulesManager = new RulesManager(mockApp);
    });

    describe('evaluateRules', () => {
        it('should return null when no rules match', async () => {
            const rules: Rule[] = [];
            const tags = ['#test'];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });

        it('should match a simple tag rule', async () => {
            const rule: TagRule = {
                id: '1',
                type: 'rule',
                tag: '#test',
                path: '/test'
            };
            const rules: Rule[] = [rule];
            const tags = ['#test'];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual(rule);
        });

        it('should not match when tag is not present', async () => {
            const rule: TagRule = {
                id: '1',
                type: 'rule',
                tag: '#test',
                path: '/test'
            };
            const rules: Rule[] = [rule];
            const tags = ['#other'];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });

        it('should evaluate content condition', async () => {
            const rule: TagRule = {
                id: '1',
                type: 'rule',
                tag: '#test',
                path: '/test',
                condition: {
                    contentCondition: {
                        operator: 'contains',
                        text: 'test content'
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ['#test'];
            mockVault.read.mockResolvedValue('This is test content');
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual(rule);
        });

        it('should not match when content condition fails', async () => {
            const rule: TagRule = {
                id: '1',
                type: 'rule',
                tag: '#test',
                path: '/test',
                condition: {
                    contentCondition: {
                        operator: 'contains',
                        text: 'test content'
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ['#test'];
            mockVault.read.mockResolvedValue('Different content');
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });

        it('should evaluate date condition', async () => {
            const rule: TagRule = {
                id: '1',
                type: 'rule',
                tag: '#test',
                path: '/test',
                condition: {
                    dateCondition: {
                        type: 'modified',
                        operator: 'olderThan',
                        days: 7
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ['#test'];
            const oldDate = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
            mockVault.adapter.stat.mockResolvedValue({ mtime: oldDate });
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual(rule);
        });

        it('should not match when date condition fails', async () => {
            const rule: TagRule = {
                id: '1',
                type: 'rule',
                tag: '#test',
                path: '/test',
                condition: {
                    dateCondition: {
                        type: 'modified',
                        operator: 'olderThan',
                        days: 7
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ['#test'];
            const recentDate = Date.now() - (6 * 24 * 60 * 60 * 1000); // 6 days ago
            mockVault.adapter.stat.mockResolvedValue({ mtime: recentDate });
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });

        it('should handle AND group rules', async () => {
            const groupRule: GroupRule = {
                id: '1',
                type: 'group',
                groupType: 'and',
                destination: '/test',
                triggers: [
                    { id: 'trigger1', tag: '#test1', conditions: undefined },
                    { id: 'trigger2', tag: '#test2', conditions: undefined }
                ]
            };
            const rules: Rule[] = [groupRule];
            const tags = ['#test1', '#test2'];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual({
                id: '1',
                type: 'rule',
                tag: '#test1',
                path: '/test',
                condition: undefined
            });
        });

        it('should handle OR group rules', async () => {
            const groupRule: GroupRule = {
                id: '1',
                type: 'group',
                groupType: 'or',
                destination: '/test',
                triggers: [
                    { id: 'trigger1', tag: '#test1', conditions: undefined },
                    { id: 'trigger2', tag: '#test2', conditions: undefined }
                ]
            };
            const rules: Rule[] = [groupRule];
            const tags = ['#test1'];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual({
                id: '1',
                type: 'rule',
                tag: '#test1',
                path: '/test',
                condition: undefined
            });
        });

        it('should handle nested group rules', async () => {
            const nestedGroup: GroupRule = {
                id: '2',
                type: 'group',
                groupType: 'or',
                destination: '/nested',
                triggers: [
                    { id: 'nested-trigger', tag: '#nested', conditions: undefined }
                ]
            };
            const parentGroup: GroupRule = {
                id: '1',
                type: 'group',
                groupType: 'and',
                destination: '/test',
                triggers: [
                    { id: 'parent-trigger', tag: '#test1', conditions: undefined }
                ],
                subgroups: [nestedGroup]
            };
            const rules: Rule[] = [parentGroup];
            const tags = ['#nested'];
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toEqual({
                id: '2',
                type: 'rule',
                tag: '#nested',
                path: '/nested',
                condition: undefined
            });
        });

        it('should handle missing file stats', async () => {
            const rule: TagRule = {
                id: '1',
                type: 'rule',
                tag: '#test',
                path: '/test',
                condition: {
                    dateCondition: {
                        type: 'modified',
                        operator: 'olderThan',
                        days: 7
                    }
                }
            };
            const rules: Rule[] = [rule];
            const tags = ['#test'];
            mockVault.adapter.stat.mockResolvedValue(null);
            const result = await rulesManager.evaluateRules(rules, tags, mockFile);
            expect(result).toBeNull();
        });
    });
}); 