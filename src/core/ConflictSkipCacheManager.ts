import type { App } from 'obsidian';
import type AdvancedNoteMoverPlugin from 'main';
import type { ConflictSkipCacheEntry } from '../types/ConflictSkipCache';
import {
  findConflictSkipEntry,
  pruneConflictSkipEntries,
  removeConflictSkipEntriesForPath,
  removeConflictSkipEntriesForSource,
  removeConflictSkipEntry,
  rewriteConflictSkipPathsOnRename,
  upsertConflictSkipEntry,
} from '../domain/conflicts/conflict-skip-cache';

export class ConflictSkipCacheManager {
  constructor(private readonly plugin: AdvancedNoteMoverPlugin) {}

  private get entries(): ConflictSkipCacheEntry[] {
    if (!this.plugin.pluginData.conflictSkipCache) {
      this.plugin.pluginData.conflictSkipCache = { entries: [] };
    }
    return this.plugin.pluginData.conflictSkipCache.entries;
  }

  private set entries(value: ConflictSkipCacheEntry[]) {
    if (!this.plugin.pluginData.conflictSkipCache) {
      this.plugin.pluginData.conflictSkipCache = { entries: [] };
    }
    this.plugin.pluginData.conflictSkipCache.entries = value;
  }

  isSkipped(sourcePath: string, targetPath: string): boolean {
    return findConflictSkipEntry(this.entries, sourcePath, targetPath) != null;
  }

  getEntries(): ConflictSkipCacheEntry[] {
    return [...this.entries];
  }

  async addSkip(sourcePath: string, targetPath: string): Promise<void> {
    this.entries = upsertConflictSkipEntry(
      this.entries,
      sourcePath,
      targetPath,
      Date.now()
    );
    await this.plugin.save_settings();
  }

  async removeForSource(sourcePath: string): Promise<void> {
    const next = removeConflictSkipEntriesForSource(this.entries, sourcePath);
    if (next.length === this.entries.length) {
      return;
    }
    this.entries = next;
    await this.plugin.save_settings();
  }

  async removeEntry(sourcePath: string, targetPath: string): Promise<void> {
    const next = removeConflictSkipEntry(this.entries, sourcePath, targetPath);
    if (next.length === this.entries.length) {
      return;
    }
    this.entries = next;
    await this.plugin.save_settings();
  }

  async clearAll(): Promise<void> {
    if (this.entries.length === 0) {
      return;
    }
    this.entries = [];
    await this.plugin.save_settings();
  }

  async prune(app: App): Promise<number> {
    const before = this.entries.length;
    const exists = (path: string) => app.vault.adapter.exists(path);
    const pruned = await pruneConflictSkipEntries(this.entries, exists);
    const removed = before - pruned.length;
    if (removed > 0) {
      this.entries = pruned;
      await this.plugin.save_settings();
    }
    return removed;
  }

  handleRename(oldPath: string, newPath: string): void {
    this.entries = rewriteConflictSkipPathsOnRename(
      this.entries,
      oldPath,
      newPath
    );
  }

  async handleRenameAndSave(oldPath: string, newPath: string): Promise<void> {
    const before = JSON.stringify(this.entries);
    this.handleRename(oldPath, newPath);
    if (JSON.stringify(this.entries) !== before) {
      await this.plugin.save_settings();
    }
  }

  async handleDelete(path: string): Promise<void> {
    const next = removeConflictSkipEntriesForPath(this.entries, path);
    if (next.length === this.entries.length) {
      return;
    }
    this.entries = next;
    await this.plugin.save_settings();
  }
}
