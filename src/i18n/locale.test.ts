import {
  fill,
  loadLocale,
  localeCatalogFile,
  localeCode,
  strings,
  useLocale,
} from './locale';

describe('loadLocale', () => {
  const english = loadLocale('en');

  it('selects a catalog by locale code and falls back to English', () => {
    const german = {
      ...english,
      unnamedRule: 'Unbenannte Regel',
    };

    expect(localeCode('EN-gb')).toBe('en');
    expect(loadLocale('en').unnamedRule).toBe('Unnamed rule');
    expect(loadLocale('de').unnamedRule).toBe('Unbenannte Regel');
    expect(loadLocale('de', { en: english, de: german }).unnamedRule).toBe(
      'Unbenannte Regel'
    );
    expect(loadLocale('fr', { en: english, de: german })).toBe(english);
  });

  it('selects languages/<code>.json from the locale code', () => {
    expect(localeCatalogFile('EN-gb')).toBe('languages/en.json');
    expect(localeCatalogFile('de_AT')).toBe('languages/de.json');
  });

  it('fills placeholders and leaves unknown tokens in place', () => {
    expect(fill('Could not find file {fileName}', { fileName: 'A.md' })).toBe(
      'Could not find file A.md'
    );
    expect(fill('Keep {count}', {})).toBe('Keep {count}');
  });

  it('uses the locale installed for the app', () => {
    useLocale('en');
    expect(strings().unnamedRule).toBe('Unnamed rule');
    useLocale('zz');
    expect(strings().unnamedRule).toBe('Unnamed rule');
  });
});
