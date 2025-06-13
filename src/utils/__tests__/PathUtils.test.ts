import { formatPath, combinePath } from '../PathUtils';

describe('PathUtils', () => {
    describe('formatPath', () => {
        it('should remove double slashes', () => {
            expect(formatPath('//test///path//')).toBe('/test/path');
        });

        it('should add a slash at the beginning if none exists', () => {
            expect(formatPath('test/path')).toBe('/test/path');
        });

        it('should remove trailing slash', () => {
            expect(formatPath('/test/path/')).toBe('/test/path');
        });

        it('should handle root path correctly', () => {
            expect(formatPath('/')).toBe('/');
            expect(formatPath('')).toBe('/');
        });
    });

    describe('combinePath', () => {
        it('should correctly combine folder path and filename', () => {
            expect(combinePath('/test/folder', 'file.md')).toBe('/test/folder/file.md');
        });

        it('should handle root path correctly', () => {
            expect(combinePath('/', 'file.md')).toBe('file.md');
        });

        it('should avoid double slashes', () => {
            expect(combinePath('/test//folder/', 'file.md')).toBe('/test/folder/file.md');
        });
    });
}); 