import { formatPath, combinePath } from '../PathUtils';

describe('PathUtils', () => {
    describe('formatPath', () => {
        it('should remove double slashes and leading slash', () => {
            expect(formatPath('//test///path//')).toBe('test/path');
        });

        it('should remove leading slash to make paths relative', () => {
            expect(formatPath('/test/path')).toBe('test/path');
        });

        it('should remove trailing slash', () => {
            expect(formatPath('/test/path/')).toBe('test/path');
        });

        it('should handle root path correctly', () => {
            expect(formatPath('/')).toBe('');
            expect(formatPath('')).toBe('');
        });

        it('should handle paths without leading slash', () => {
            expect(formatPath('test/path')).toBe('test/path');
        });

        it('should handle single folder', () => {
            expect(formatPath('folder')).toBe('folder');
            expect(formatPath('/folder/')).toBe('folder');
        });
    });

    describe('combinePath', () => {
        it('should correctly combine folder path and filename', () => {
            expect(combinePath('test/folder', 'file.md')).toBe('test/folder/file.md');
        });

        it('should handle paths with leading slash', () => {
            expect(combinePath('/test/folder', 'file.md')).toBe('test/folder/file.md');
        });

        it('should handle root path correctly', () => {
            expect(combinePath('/', 'file.md')).toBe('file.md');
            expect(combinePath('', 'file.md')).toBe('file.md');
        });

        it('should avoid double slashes', () => {
            expect(combinePath('/test//folder/', 'file.md')).toBe('test/folder/file.md');
        });

        it('should handle empty folder', () => {
            expect(combinePath('', 'file.md')).toBe('file.md');
        });
    });
}); 