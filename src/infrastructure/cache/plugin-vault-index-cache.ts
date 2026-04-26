import type { App, Plugin } from 'obsidian';
import { TAbstractFile, TFile, getAllTags } from 'obsidian';
import { parseListProperty } from '../../domain/property/parseListProperty';
import { isListProperty } from '../../domain/property/isListProperty';
import type { PerformanceTraceRecorder } from '../debug/performance-trace';

const METADATA_INDEX_INVALIDATE_MS = 400;

/**
 * Central vault index cache: markdown file list + derived tag/property indices.
 * Invalidated via vault events (see registerVaultEventHooks) and debounced metadata updates.
 */
export class PluginVaultIndexCache {
  private cacheEnabledResolver: () => boolean = () => true;
  private perf: PerformanceTraceRecorder | null = null;

  private markdownListGeneration = 0;
  private cachedMarkdownFiles: TFile[] | null = null;
  private listFilledAtGeneration = -1;

  private indicesGeneration = 0;
  private tagSet: Set<string> | null = null;
  private tagsBuiltForGeneration = -1;

  private readonly propertyValuesByName = new Map<
    string,
    { generation: number; values: Set<string> }
  >();

  private propertySuggestBundle: {
    generation: number;
    keys: Set<string>;
    valuesByKey: Map<string, Set<string>>;
  } | null = null;

  private metadataDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** When resolver returns false, all reads bypass in-memory indices. */
  setCacheEnabledResolver(resolver: () => boolean): void {
    this.cacheEnabledResolver = resolver;
  }

  setPerformanceRecorder(recorder: PerformanceTraceRecorder | null): void {
    this.perf = recorder;
  }

  private traceSync<T>(
    name: string,
    fn: () => T,
    meta?: Record<string, unknown>
  ): T {
    return this.perf ? this.perf.recordSync(name, fn, meta) : fn();
  }

  /**
   * Markdown paths changed (create / delete / rename). Refreshes file list and derived indices.
   */
  invalidateMarkdownList(): void {
    this.markdownListGeneration++;
    this.cachedMarkdownFiles = null;
    this.listFilledAtGeneration = -1;
    this.bumpIndicesGenerationImmediate();
  }

  /**
   * Frontmatter/tags may have changed without structural vault change. Debounced.
   */
  scheduleMetadataDerivedInvalidate(): void {
    if (this.metadataDebounceTimer !== null) {
      clearTimeout(this.metadataDebounceTimer);
    }
    this.metadataDebounceTimer = setTimeout(() => {
      this.metadataDebounceTimer = null;
      this.bumpIndicesGenerationImmediate();
    }, METADATA_INDEX_INVALIDATE_MS);
  }

  private bumpIndicesGenerationImmediate(): void {
    this.indicesGeneration++;
    this.tagSet = null;
    this.tagsBuiltForGeneration = -1;
    this.propertyValuesByName.clear();
    this.propertySuggestBundle = null;
  }

  getMarkdownFilesCached(app: App): TFile[] {
    return this.traceSync(
      'PluginVaultIndexCache.getMarkdownFilesCached',
      () => {
        if (!this.cacheEnabledResolver()) {
          return app.vault.getMarkdownFiles();
        }
        if (
          this.cachedMarkdownFiles !== null &&
          this.listFilledAtGeneration === this.markdownListGeneration
        ) {
          return this.cachedMarkdownFiles;
        }
        const files = app.vault.getMarkdownFiles();
        this.cachedMarkdownFiles = files;
        this.listFilledAtGeneration = this.markdownListGeneration;
        return files;
      },
      { cacheEnabled: this.cacheEnabledResolver() }
    );
  }

  getAllTagsCached(app: App): Set<string> {
    return this.traceSync('PluginVaultIndexCache.getAllTagsCached', () => {
      if (!this.cacheEnabledResolver()) {
        const tags = new Set<string>();
        const files = app.vault.getMarkdownFiles();
        for (const file of files) {
          const fileCache = app.metadataCache.getFileCache(file);
          const fileTags = getAllTags(fileCache || {}) || [];
          for (const t of fileTags) {
            tags.add(t);
          }
        }
        return tags;
      }
      if (
        this.tagSet !== null &&
        this.tagsBuiltForGeneration === this.indicesGeneration
      ) {
        return this.tagSet;
      }
      const tags = new Set<string>();
      const files = this.getMarkdownFilesCached(app);
      for (const file of files) {
        const fileCache = app.metadataCache.getFileCache(file);
        const fileTags = getAllTags(fileCache || {}) || [];
        for (const t of fileTags) {
          tags.add(t);
        }
      }
      this.tagSet = tags;
      this.tagsBuiltForGeneration = this.indicesGeneration;
      return tags;
    });
  }

  /**
   * Collect distinct values for a frontmatter property (same semantics as PropertyValueSuggest).
   */
  getPropertyValueSetCached(
    app: App,
    propertyName: string,
    propertyType: 'text' | 'number' | 'checkbox' | 'date' | 'list'
  ): Set<string> {
    return this.traceSync(
      'PluginVaultIndexCache.getPropertyValueSetCached',
      () => {
        if (!this.cacheEnabledResolver()) {
          const values = new Set<string>();
          if (propertyType === 'date') {
            return values;
          }
          const files = app.vault.getMarkdownFiles();
          for (const file of files) {
            const cache = app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.[propertyName] !== undefined) {
              const raw = cache.frontmatter[propertyName];
              this.addPropertySampleToSet(values, raw, propertyType);
            }
          }
          return values;
        }

        const existing = this.propertyValuesByName.get(propertyName);
        if (existing && existing.generation === this.indicesGeneration) {
          return existing.values;
        }
        const values = new Set<string>();
        if (propertyType === 'date') {
          this.propertyValuesByName.set(propertyName, {
            generation: this.indicesGeneration,
            values,
          });
          return values;
        }

        const files = this.getMarkdownFilesCached(app);
        for (const file of files) {
          const cache = app.metadataCache.getFileCache(file);
          if (cache?.frontmatter?.[propertyName] !== undefined) {
            const raw = cache.frontmatter[propertyName];
            this.addPropertySampleToSet(values, raw, propertyType);
          }
        }

        this.propertyValuesByName.set(propertyName, {
          generation: this.indicesGeneration,
          values,
        });
        return values;
      },
      { propertyName, propertyType }
    );
  }

  private addPropertySampleToSet(
    target: Set<string>,
    value: unknown,
    propertyType: 'text' | 'number' | 'checkbox' | 'list'
  ): void {
    switch (propertyType) {
      case 'text':
        if (typeof value === 'string' && value.trim()) {
          target.add(value.trim());
        }
        break;
      case 'number':
        if (typeof value === 'number') {
          target.add(value.toString());
        } else if (typeof value === 'string' && this.isNumberString(value)) {
          target.add(value.trim());
        }
        break;
      case 'checkbox':
        if (typeof value === 'boolean') {
          target.add(value.toString());
        } else if (typeof value === 'string' && this.isBooleanString(value)) {
          target.add(value.trim().toLowerCase());
        }
        break;
      case 'list':
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
              target.add(item.trim());
            }
          });
        } else if (typeof value === 'string' && isListProperty(value)) {
          parseListProperty(value).forEach(item => {
            if (item.trim()) {
              target.add(item.trim());
            }
          });
        }
        break;
      default:
        break;
    }
  }

  private isNumberString(value: string): boolean {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      return !isNaN(num) && isFinite(num);
    }
    return false;
  }

  private isBooleanString(value: string): boolean {
    const trimmed = value.trim().toLowerCase();
    return (
      trimmed === 'true' ||
      trimmed === 'false' ||
      trimmed === 'yes' ||
      trimmed === 'no' ||
      trimmed === 'on' ||
      trimmed === 'off' ||
      trimmed === '1' ||
      trimmed === '0'
    );
  }

  /**
   * Collect property keys and per-key value sets (AdvancedSuggest blacklist UI).
   */
  getPropertyKeysAndValuesCached(app: App): {
    keys: Set<string>;
    valuesByKey: Map<string, Set<string>>;
  } {
    return this.traceSync(
      'PluginVaultIndexCache.getPropertyKeysAndValuesCached',
      () => {
        const build = (): {
          keys: Set<string>;
          valuesByKey: Map<string, Set<string>>;
        } => {
          const keys = new Set<string>();
          const valuesByKey = new Map<string, Set<string>>();
          const files = this.getMarkdownFilesCached(app);

          for (const file of files) {
            const cachedMetadata = app.metadataCache.getFileCache(file);
            if (!cachedMetadata?.frontmatter) {
              continue;
            }
            for (const [key, value] of Object.entries(
              cachedMetadata.frontmatter
            )) {
              if (key.startsWith('position') || key === 'tags') {
                continue;
              }
              keys.add(key);
              if (!valuesByKey.has(key)) {
                valuesByKey.set(key, new Set());
              }
              const setForKey = valuesByKey.get(key)!;
              if (value !== null && value !== undefined) {
                if (isListProperty(value)) {
                  parseListProperty(value).forEach(item => {
                    if (item) {
                      setForKey.add(item);
                    }
                  });
                } else {
                  setForKey.add(String(value));
                }
              }
            }
          }
          return { keys, valuesByKey };
        };

        if (!this.cacheEnabledResolver()) {
          return build();
        }

        if (
          this.propertySuggestBundle !== null &&
          this.propertySuggestBundle.generation === this.indicesGeneration
        ) {
          return {
            keys: this.propertySuggestBundle.keys,
            valuesByKey: this.propertySuggestBundle.valuesByKey,
          };
        }

        const { keys, valuesByKey } = build();

        this.propertySuggestBundle = {
          generation: this.indicesGeneration,
          keys,
          valuesByKey,
        };
        return { keys, valuesByKey };
      }
    );
  }

  /**
   * Register debounced invalidation when note metadata changes (frontmatter/tags).
   */
  attachMetadataInvalidationListeners(plugin: Plugin & { app: App }): void {
    plugin.registerEvent(
      plugin.app.metadataCache.on('changed', (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.scheduleMetadataDerivedInvalidate();
        }
      })
    );
    plugin.registerEvent(
      plugin.app.metadataCache.on('resolved', () => {
        this.scheduleMetadataDerivedInvalidate();
      })
    );
  }
}
