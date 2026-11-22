import catalogs from 'virtual:languages';
import { pluralize } from '../utils/pluralize';

export type LocaleCatalog = typeof catalogs.en;

/** Every languages/<code>.json, bundled into main.js at build time (no runtime file read). */
const bundled: Record<string, LocaleCatalog> = catalogs;

/** `en-gb` and `EN` both select languages/en.json. */
export function localeCode(locale: string): string {
  const code = locale.trim().toLowerCase().split(/[-_]/)[0];
  return code || 'en';
}

export function loadLocale(
  locale: string,
  available: Record<string, LocaleCatalog> = bundled
): LocaleCatalog {
  return available[localeCode(locale)] ?? available.en;
}

let active: LocaleCatalog = bundled.en;
let activeCode = 'en';

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
  const template = readString(active, key) ?? readString(bundled.en, key);
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
  attachment: ['Anhang', 'Anhänge'],
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
