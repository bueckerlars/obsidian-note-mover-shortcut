import { getAllTags } from '../tags';

describe('getAllTags', () => {
    it('gibt ein leeres Array zurück, wenn keine Tags vorhanden sind', () => {
        const cache = {};
        expect(getAllTags(cache as any)).toEqual([]);
    });

    it('gibt alle Tags als Array von Strings zurück', () => {
        const cache = {
            tags: [
                { tag: '#test1' },
                { tag: '#test2' }
            ]
        };
        expect(getAllTags(cache as any)).toEqual(['#test1', '#test2']);
    });
}); 