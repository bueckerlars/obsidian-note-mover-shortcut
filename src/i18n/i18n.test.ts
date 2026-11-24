import { describe, expect, it, afterEach } from 'vitest';
import de from '../../languages/de.json';
import en from '../../languages/en.json';
import { loadLocale, plural, t, useLocale, type LocaleCatalog } from './locale';

function leaves(
  value: unknown,
  prefix: string,
  out: Map<string, string>
): void {
  if (typeof value === 'string') {
    out.set(prefix, value);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      leaves(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
}

function placeholders(value: string): string[] {
  return [
    ...value.matchAll(/\{\{[^}]*\}\}|\{\{[^},\s]*|\{[A-Za-z0-9]+\}/g),
  ].map(match => match[0]);
}

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

describe('languages/de.json', () => {
  const english = new Map<string, string>();
  const german = new Map<string, string>();
  leaves(en, '', english);
  leaves(de, '', german);

  it('has the same keys as English', () => {
    expect([...german.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('keeps placeholders identical, including names and order', () => {
    for (const [key, value] of english) {
      expect(placeholders(german.get(key) ?? ''), key).toEqual(
        placeholders(value)
      );
    }
  });

  it('keeps a German noun capitalized inside a sentence', () => {
    expect(de.settings.rulesIntroTail).toContain('Kriterien');
    expect(de.settings.rulesIntroTail).toContain('Regeln');
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
