import { normalizePath, type App, type PluginManifest } from 'obsidian';
import {
  installCatalogs,
  localeCatalogFile,
  localeCode,
  useLocale,
  type LocaleCatalog,
} from './locale';

function pluginRoot(app: App, manifest: PluginManifest): string {
  if (manifest.dir) {
    return manifest.dir;
  }
  return `${app.vault.configDir}/plugins/${manifest.id}`;
}

function isCatalog(value: unknown): value is LocaleCatalog {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return typeof (value as { unnamedRule?: unknown }).unnamedRule === 'string';
}

async function readCatalog(
  app: App,
  root: string,
  locale: string
): Promise<LocaleCatalog | undefined> {
  const path = normalizePath(`${root}/${localeCatalogFile(locale)}`);
  try {
    const text = await app.vault.adapter.read(path);
    const parsed: unknown = JSON.parse(text);
    return isCatalog(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function loadPluginLocale(
  app: App,
  manifest: PluginManifest,
  locale: string
): Promise<void> {
  const root = pluginRoot(app, manifest);
  const code = localeCode(locale);
  const selected = await readCatalog(app, root, code);
  const english = code === 'en' ? selected : await readCatalog(app, root, 'en');
  const catalogs: Record<string, LocaleCatalog> = {};
  if (english) {
    catalogs.en = english;
  }
  if (selected && code !== 'en') {
    catalogs[code] = selected;
  }
  installCatalogs(catalogs);
  useLocale(selected ? locale : 'en');
}
