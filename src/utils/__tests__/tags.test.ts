import { getAllTags } from '../tags';

describe('getAllTags', () => {
    it('returns an empty array when no tags are present', () => {
        const cache = {};
        expect(getAllTags(cache as any)).toEqual([]);
    });

    it('returns all tags as an array of strings', () => {
        const cache = {
            tags: [
                { tag: '#test1' },
                { tag: '#test2' }
            ]
        };
        expect(getAllTags(cache as any)).toEqual(['#test1', '#test2']);
    });
}); 