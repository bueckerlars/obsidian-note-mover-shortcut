import { TFile } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';
import { VaultIndexCache } from './VaultIndexCache';
import { MetadataIndexer } from './MetadataIndexer';

/**
 * Coordinates index initialization, dirty queue processing, and (later) verification.
 * @since 0.4.7
 */
export class IndexOrchestrator {
  private cache: VaultIndexCache;
  private indexer: MetadataIndexer;
  private dirtyQueue: Set<string> = new Set();
  private onStatus?: (status: {
    state: 'idle' | 'processing';
    dirty: number;
  }) => void;

  constructor(private plugin: NoteMoverShortcutPlugin) {
    this.cache = new VaultIndexCache(plugin);
    this.indexer = new MetadataIndexer(plugin);
  }

  public async ensureInitialized(): Promise<void> {
    await this.cache.load();
    this.emitStatus();
  }

  public queueDirty(path: string): void {
    this.dirtyQueue.add(path);
    this.cache.markDirty(path);
    this.emitStatus();
  }

  public async processQueue(
    deadlineMs = 25,
    withContent = false
  ): Promise<void> {
    const start = Date.now();
    while (this.dirtyQueue.size > 0 && Date.now() - start < deadlineMs) {
      this.emitStatus('processing');
      const path = this.dirtyQueue.values().next().value as string;
      this.dirtyQueue.delete(path);
      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile || (file as any)?.extension === 'md') {
        const indexing = (this.plugin.settings as any).settings?.indexing || {};
        const mode: 'mtimeSize' | 'hash' =
          indexing.detectionMode || 'mtimeSize';
        const includeContent =
          withContent || (indexing.maxExcerptBytes ?? 0) > 0;
        const entry = await this.indexer.indexFile(
          file as TFile,
          mode,
          includeContent
        );
        this.cache.upsert(entry);
      }
    }
    await this.cache.persist();
    this.emitStatus();
  }

  /** Enqueue all markdown files in the vault for (re)indexing */
  public enqueueAllMarkdownFiles(): void {
    const files = this.plugin.app.vault.getMarkdownFiles();
    for (const f of files) {
      this.queueDirty(f.path);
    }
    this.emitStatus();
  }

  /** Process the entire dirty queue by iterating in small time slices */
  public async processAllDirty(withContent = false): Promise<void> {
    while (this.dirtyQueue.size > 0) {
      await this.processQueue(50, withContent);
      // Yield to event loop implicitly between awaits
    }
    this.emitStatus();
  }

  /** Return all indexed canonical paths */
  public getIndexedPaths(): string[] {
    return this.cache.getMany().map(e => e.path);
  }

  /** Resolve indexed files to TFile objects (existing only) */
  public getIndexedFiles(): TFile[] {
    const paths = this.getIndexedPaths();
    const result: TFile[] = [];
    for (const p of paths) {
      const af = this.plugin.app.vault.getAbstractFileByPath(p);
      if (af instanceof TFile && af.extension === 'md') {
        result.push(af);
      }
    }
    return result;
  }

  /** Verify current vault snapshot against index and mark mismatches dirty */
  public async verifySnapshot(): Promise<void> {
    await this.ensureInitialized();
    const indexPaths = new Set(this.getIndexedPaths());
    const files = this.plugin.app.vault.getMarkdownFiles();
    const seen = new Set<string>();

    // Check existing files for signature mismatches or missing entries
    for (const f of files) {
      seen.add(f.path);
      const entry = this.cache.get(f.path);
      if (!entry) {
        this.queueDirty(f.path);
        continue;
      }
      const stat: any = (f as any).stat || {};
      const mode =
        ((this.plugin.settings as any).settings?.indexing
          ?.detectionMode as any) || 'mtimeSize';
      if (mode === 'mtimeSize') {
        const changed =
          entry.signature?.mtime !== stat.mtime ||
          entry.signature?.size !== stat.size;
        if (changed) this.queueDirty(f.path);
      } else {
        // hash mode cannot be checked cheaply without reading; schedule reindex
        this.queueDirty(f.path);
      }
    }

    // Remove entries that no longer exist on disk
    for (const p of indexPaths) {
      if (!seen.has(p)) {
        this.cache.delete(p);
      }
    }

    await this.cache.persist();
    this.emitStatus();
  }

  /** Delete a path from index */
  public deletePath(path: string): void {
    this.cache.delete(path);
    this.emitStatus();
  }

  /** Register a status callback for UI updates */
  public registerStatusCallback(
    cb: (status: { state: 'idle' | 'processing'; dirty: number }) => void
  ): void {
    this.onStatus = cb;
    this.emitStatus();
  }

  private emitStatus(state: 'idle' | 'processing' = 'idle'): void {
    if (!this.onStatus) return;
    const dirty = this.dirtyQueue.size;
    this.onStatus({ state: dirty > 0 ? state : 'idle', dirty });
  }
}
