import NoteMoverShortcutPlugin from 'main';
import {
  IndexData,
  IndexEntry,
  IndexStats,
  PluginData,
} from 'src/types/PluginData';

/**
 * VaultIndexCache provides an in-memory view over the persisted index data
 * stored in data.json under PluginData.index. It offers convenient CRUD
 * operations and ensures persistence via the plugin's save mechanism.
 * @since 0.4.7
 */
export class VaultIndexCache {
  private plugin: NoteMoverShortcutPlugin;

  constructor(plugin: NoteMoverShortcutPlugin) {
    this.plugin = plugin;
  }

  public async load(): Promise<void> {
    const settings = this.plugin.settings as PluginData;
    if (!settings.index) {
      settings.index = this.buildEmptyIndex();
      await (this.plugin as any).save_settings?.();
    }
  }

  public async persist(): Promise<void> {
    await (this.plugin as any).save_settings?.();
  }

  public get(path: string): IndexEntry | undefined {
    return this.plugin.settings.index?.entries?.[path];
  }

  public getMany(filter?: (e: IndexEntry) => boolean): IndexEntry[] {
    const map = this.plugin.settings.index?.entries || {};
    const values = Object.values(map);
    return filter ? values.filter(filter) : values;
  }

  public upsert(entry: IndexEntry): void {
    const index = this.ensureIndex();
    index.entries[entry.path] = entry;
    index.stats.numFiles = Object.keys(index.entries).length;
    index.updatedAt = new Date().toISOString();
  }

  public markDirty(path: string): void {
    const existing = this.get(path);
    if (existing) {
      existing.dirty = true;
      const index = this.ensureIndex();
      index.stats.numDirty = this.countDirty(index);
      index.updatedAt = new Date().toISOString();
    }
  }

  public delete(path: string): void {
    const index = this.ensureIndex();
    delete index.entries[path];
    index.stats.numFiles = Object.keys(index.entries).length;
    index.stats.numDirty = this.countDirty(index);
    index.updatedAt = new Date().toISOString();
  }

  public stats(): IndexStats {
    return { ...(this.ensureIndex().stats as any) } as IndexStats;
  }

  private ensureIndex(): IndexData {
    const settings = this.plugin.settings as PluginData;
    if (!settings.index) {
      settings.index = this.buildEmptyIndex();
    }
    return settings.index as IndexData;
  }

  private buildEmptyIndex(): IndexData {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      stats: { numFiles: 0, numDirty: 0 },
      entries: {},
    } as IndexData;
  }

  private countDirty(index: IndexData): number {
    let count = 0;
    for (const e of Object.values(index.entries)) {
      if (e?.dirty) count++;
    }
    return count;
  }
}
