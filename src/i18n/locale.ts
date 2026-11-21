import catalogs from 'virtual:languages';

export type LocaleCatalog = typeof catalogs.en;

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
  const catalog = available[localeCode(locale)] ?? available.en;
  if (!catalog) {
    throw new Error('languages/en.json is missing');
  }
  return catalog;
}

let active = loadLocale('en');

export function useLocale(locale: string): void {
  active = loadLocale(locale);
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
