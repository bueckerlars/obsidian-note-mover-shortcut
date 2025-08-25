import { RuleManager } from '../RuleManager';
import { App, TFile, getAllTags } from 'obsidian';

jest.mock('obsidian', () => {
    const original = jest.requireActual('obsidian');
    return {
        ...original,
        getAllTags: jest.fn()
    };
});

(getAllTags as jest.Mock).mockReturnValue(['#tag1']);

describe('RuleManager', () => {
    let mockApp: any;
    let mockFile: TFile;
    let ruleManager: RuleManager;

    beforeEach(() => {
        mockApp = {
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({ tags: [{ tag: '#tag1' }] })
            },
            vault: {
                read: jest.fn().mockResolvedValue('file content'),
            }
        };
        mockFile = {
            name: 'file.md',
            path: 'folder/file.md',
            stat: { ctime: Date.now(), mtime: Date.now() }
        } as any;
        ruleManager = new RuleManager(mockApp, 'default');
    });

    it('should skip file if fileName filter matches (blacklist)', async () => {
        ruleManager.setFilter(['fileName: file.md'], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBeNull();
    });

    it('should skip file if path filter matches (blacklist)', async () => {
        ruleManager.setFilter(['path: folder/file.md'], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBeNull();
    });

    it('should skip file if content filter matches (blacklist)', async () => {
        ruleManager.setFilter(['content: file content'], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBeNull();
    });

    it('should skip file if created_at filter matches (blacklist)', async () => {
        const date = new Date(mockFile.stat.ctime).toISOString().slice(0, 10);
        ruleManager.setFilter([`created_at: ${date}`], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBeNull();
    });

    it('should skip file if updated_at filter matches (blacklist)', async () => {
        const date = new Date(mockFile.stat.mtime).toISOString().slice(0, 10);
        ruleManager.setFilter([`updated_at: ${date}`], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBeNull();
    });

    it('should not skip file if skipFilter=true', async () => {
        ruleManager.setFilter(['fileName: file.md'], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile, true);
        expect(result).toBe('default');
    });

    it('should handle invalid filter string gracefully', async () => {
        ruleManager.setFilter(['invalidfilter'], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('default');
    });

    it('should return rule path if tag matches', async () => {
        ruleManager.setRules([{ criteria: 'tag: #tag1', path: 'special' }]);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('special');
    });

    it('should return rule path if fileName matches', async () => {
        ruleManager.setRules([{ criteria: 'fileName: file.md', path: 'special' }]);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('special');
    });

    it('should return rule path if path matches', async () => {
        ruleManager.setRules([{ criteria: 'path: folder/file.md', path: 'special' }]);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('special');
    });

    it('should return rule path if content matches', async () => {
        ruleManager.setRules([{ criteria: 'content: file content', path: 'special' }]);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('special');
    });

    it('should return defaultFolder if no rules match', async () => {
        ruleManager.setRules([{ criteria: 'tag: #other', path: 'special' }]);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('default');
    });

    it('should handle missing tags gracefully', async () => {
        mockApp.metadataCache.getFileCache = jest.fn().mockReturnValue({});
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('default');
    });

    it('should handle missing rules gracefully', async () => {
        ruleManager.setRules([]);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('default');
    });

    it('should handle null createdAt/updatedAt', async () => {
        mockFile.stat = { ctime: undefined, mtime: undefined } as any;
        ruleManager.setFilter(['created_at: 2023-01-01'], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('default');
    });

    it('should handle error in file read gracefully', async () => {
        mockApp.vault.read = jest.fn().mockRejectedValue(new Error('fail'));
        ruleManager.setFilter(['content: something'], false);
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBe('default');
    });

    it('should handle error in getFileCache gracefully', async () => {
        mockApp.metadataCache.getFileCache = jest.fn(() => { throw new Error('fail'); });
        const result = await ruleManager.moveFileBasedOnTags(mockFile);
        expect(result).toBeNull(); // Da catch-Block return null
    });

    // Tests für hierarchisches Tag-Matching (Subtag-Feature)
    describe('Hierarchical Tag Matching', () => {
        beforeEach(() => {
            // Reset mock to avoid interference from other tests
            (getAllTags as jest.Mock).mockClear();
        });

        it('should match parent tag when file has subtag', async () => {
            (getAllTags as jest.Mock).mockReturnValue(['#food/recipes']);
            ruleManager.setRules([{ criteria: 'tag: #food', path: 'food-folder' }]);
            const result = await ruleManager.moveFileBasedOnTags(mockFile);
            expect(result).toBe('food-folder');
        });

        it('should prioritize more specific tag rules over general ones', async () => {
            (getAllTags as jest.Mock).mockReturnValue(['#food/recipes']);
            ruleManager.setRules([
                { criteria: 'tag: #food', path: 'food-folder' },
                { criteria: 'tag: #food/recipes', path: 'recipes-folder' }
            ]);
            const result = await ruleManager.moveFileBasedOnTags(mockFile);
            expect(result).toBe('recipes-folder');
        });

        it('should match exact tag over subtag pattern', async () => {
            (getAllTags as jest.Mock).mockReturnValue(['#food']);
            ruleManager.setRules([{ criteria: 'tag: #food', path: 'food-folder' }]);
            const result = await ruleManager.moveFileBasedOnTags(mockFile);
            expect(result).toBe('food-folder');
        });

        it('should handle multiple subtag levels', async () => {
            (getAllTags as jest.Mock).mockReturnValue(['#food/recipes/italian']);
            ruleManager.setRules([
                { criteria: 'tag: #food', path: 'food-folder' },
                { criteria: 'tag: #food/recipes', path: 'recipes-folder' },
                { criteria: 'tag: #food/recipes/italian', path: 'italian-folder' }
            ]);
            const result = await ruleManager.moveFileBasedOnTags(mockFile);
            expect(result).toBe('italian-folder');
        });

        it('should not match unrelated tags', async () => {
            (getAllTags as jest.Mock).mockReturnValue(['#foods']);
            ruleManager.setRules([{ criteria: 'tag: #food', path: 'food-folder' }]);
            const result = await ruleManager.moveFileBasedOnTags(mockFile);
            expect(result).toBe('default');
        });

        it('should handle hierarchical filtering in blacklist', async () => {
            (getAllTags as jest.Mock).mockReturnValue(['#food/recipes']);
            ruleManager.setFilter(['tag: #food'], false); // blacklist
            const result = await ruleManager.moveFileBasedOnTags(mockFile);
            expect(result).toBeNull(); // Should be filtered out
        });

        it('should handle hierarchical filtering in whitelist', async () => {
            (getAllTags as jest.Mock).mockReturnValue(['#food/recipes']);
            ruleManager.setFilter(['tag: #food'], true); // whitelist
            ruleManager.setRules([{ criteria: 'tag: #food', path: 'food-folder' }]);
            const result = await ruleManager.moveFileBasedOnTags(mockFile);
            expect(result).toBe('food-folder'); // Should pass whitelist and match rule
        });
    });
}); 