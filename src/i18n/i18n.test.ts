import { describe, expect, it, afterEach } from 'vitest';
import { loadLocale, plural, t, useLocale, type LocaleCatalog } from './locale';

describe('t', () => {
  afterEach(() => {
    useLocale('en');
  });

  it('returns the English string when the active catalog omits the key', () => {
    const english = loadLocale('en');
    const german = structuredClone(english);
    delete (german.notices as { couldNotFindFile?: string }).couldNotFindFile;
    german.common.cancel = 'Abbrechen';

    useLocale('de', { en: english, de: german as LocaleCatalog });

    expect(t('common.cancel')).toBe('Abbrechen');
    expect(t('notices.couldNotFindFile', { fileName: 'A.md' })).toBe(
      'Could not find file A.md'
    );
  });

  it('returns the key when neither catalog has it', () => {
    expect(t('missing.key')).toBe('missing.key');
  });
});

describe('plural', () => {
  afterEach(() => {
    useLocale('en');
  });

  it('uses a German singular for 1 and a German plural for 2', () => {
    useLocale('de');
    expect(plural(1, 'file')).toBe('1 Datei');
    expect(plural(2, 'file')).toBe('2 Dateien');
  });

  it('keeps the English helper for the English locale', () => {
    useLocale('en');
    expect(plural(1, 'file')).toBe('1 file');
    expect(plural(2, 'file')).toBe('2 files');
  });
});
