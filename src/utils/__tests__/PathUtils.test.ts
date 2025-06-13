import { formatPath, combinePath } from '../PathUtils';

describe('PathUtils', () => {
    describe('formatPath', () => {
        it('sollte doppelte Slashes entfernen', () => {
            expect(formatPath('//test///path//')).toBe('/test/path');
        });

        it('sollte einen Slash am Anfang hinzufügen, wenn keiner vorhanden ist', () => {
            expect(formatPath('test/path')).toBe('/test/path');
        });

        it('sollte einen Slash am Ende entfernen', () => {
            expect(formatPath('/test/path/')).toBe('/test/path');
        });

        it('sollte den Root-Pfad korrekt behandeln', () => {
            expect(formatPath('/')).toBe('/');
            expect(formatPath('')).toBe('/');
        });
    });

    describe('combinePath', () => {
        it('sollte Ordnerpfad und Dateinamen korrekt kombinieren', () => {
            expect(combinePath('/test/folder', 'file.md')).toBe('/test/folder/file.md');
        });

        it('sollte mit dem Root-Pfad korrekt umgehen', () => {
            expect(combinePath('/', 'file.md')).toBe('file.md');
        });

        it('sollte doppelte Slashes vermeiden', () => {
            expect(combinePath('/test//folder/', 'file.md')).toBe('/test/folder/file.md');
        });
    });
}); 