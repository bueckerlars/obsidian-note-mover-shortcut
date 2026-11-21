import { pluralize } from '../utils/pluralize';

export type LocaleCatalog = typeof import('../../languages/en.json');

const FALLBACK = {
  unnamedRule: 'Unnamed rule',
  common: {
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    ok: 'OK',
    delete: 'Delete',
  },
  commands: {
    moveActiveNote: 'Move active note to note folder',
    moveAllFiles: 'Move all files in vault',
    whyNotMoved: 'Why not moved?',
    showReleaseNotes: 'Show release notes',
    showHistory: 'Show history',
    reviewSkippedConflicts: 'Review skipped move conflicts',
    previewBulk: 'Preview bulk movement for all files',
    reEvaluateVault: 'Re-evaluate entire vault with current rules',
    previewActiveNote: 'Preview active note movement',
    addCurrentFileToBlacklist: 'Add current file to blacklist',
  },
} as LocaleCatalog;

let installed: Record<string, LocaleCatalog> = { en: FALLBACK };
let active: LocaleCatalog = FALLBACK;
let activeCode = 'en';

/** `en-gb` and `EN` both select languages/en.json. */
export function localeCode(locale: string): string {
  const code = locale.trim().toLowerCase().split(/[-_]/)[0];
  return code || 'en';
}

export function localeCatalogFile(locale: string): string {
  return `languages/${localeCode(locale)}.json`;
}

export function installCatalogs(catalogs: Record<string, LocaleCatalog>): void {
  installed = catalogs.en ? catalogs : { ...catalogs, en: FALLBACK };
  active = loadLocale(activeCode);
}

export function loadLocale(
  locale: string,
  available?: Record<string, LocaleCatalog>
): LocaleCatalog {
  const catalogs = available ?? installed;
  return (
    catalogs[localeCode(locale)] ?? catalogs.en ?? installed.en ?? FALLBACK
  );
}

export function useLocale(
  locale: string,
  available?: Record<string, LocaleCatalog>
): void {
  activeCode = localeCode(locale);
  active = loadLocale(locale, available);
}

export function strings(): LocaleCatalog {
  return active;
}

export function fill(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (token, key: string) => {
    const value = values[key];
    return value === undefined ? token : String(value);
  });
}

function readString(catalog: LocaleCatalog, key: string): string | undefined {
  let current: unknown = catalog;
  for (const part of key.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  const template =
    readString(active, key) ?? readString(installed.en ?? FALLBACK, key);
  if (template === undefined) {
    return key;
  }
  return params ? fill(template, params) : template;
}

const GERMAN_NOUNS: Record<string, readonly [string, string]> = {
  file: ['Datei', 'Dateien'],
  rule: ['Regel', 'Regeln'],
  filter: ['Filter', 'Filter'],
  note: ['Notiz', 'Notizen'],
  error: ['Fehler', 'Fehler'],
};

export function plural(
  count: number,
  singular: string,
  pluralForm?: string
): string {
  if (activeCode !== 'de') {
    return pluralize(count, singular, pluralForm);
  }
  const pair = GERMAN_NOUNS[singular];
  if (pair) {
    return `${count} ${count === 1 ? pair[0] : pair[1]}`;
  }
  const word = count === 1 ? singular : (pluralForm ?? singular);
  return `${count} ${word}`;
}
