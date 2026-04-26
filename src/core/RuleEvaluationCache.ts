import { RuleV2 } from '../types/RuleV2';
import { Filter } from '../types/PluginData';

interface CacheEntry {
  mtime: number;
  matchedDestination: string | null;
  rulesHash: string;
}

/**
 * Caches rule evaluation results per file to avoid redundant re-evaluation.
 *
 * Files are only re-evaluated when they are "dirty" (modified/created/renamed)
 * or when the rules/filters configuration has changed. During periodic bulk
 * runs this turns an O(files * rules) operation into O(dirty_files * rules).
 */
export class RuleEvaluationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private dirtyFiles: Set<string> = new Set();
  private currentRulesHash = '';

  /**
   * Recompute the rules hash from the current configuration.
   * Must be called whenever rules or filters change.
   */
  public updateRulesHash(rulesV2: RuleV2[], filters: Filter[]): void {
    const newHash = this.computeRulesHash(rulesV2, filters);
    if (newHash !== this.currentRulesHash) {
      this.currentRulesHash = newHash;
      this.invalidateAll();
    }
  }

  /** Mark a file as needing re-evaluation (e.g. after modify / create). */
  public markDirty(path: string): void {
    this.dirtyFiles.add(path);
  }

  /** Handle a file rename: migrate the cache entry and mark the new path dirty. */
  public handleRename(oldPath: string, newPath: string): void {
    this.cache.delete(oldPath);
    this.dirtyFiles.delete(oldPath);
    this.dirtyFiles.add(newPath);
  }

  /** Handle a file deletion: remove all traces from cache. */
  public handleDelete(path: string): void {
    this.cache.delete(path);
    this.dirtyFiles.delete(path);
  }

  /**
   * Returns `true` when the file needs rule evaluation — either because it
   * has been marked dirty, has no cache entry, or the rules changed since
   * the entry was written.
   */
  public needsEvaluation(path: string, mtime: number): boolean {
    if (this.dirtyFiles.has(path)) return true;

    const entry = this.cache.get(path);
    if (!entry) return true;
    if (entry.rulesHash !== this.currentRulesHash) return true;
    if (entry.mtime !== mtime) return true;

    return false;
  }

  /** Get the cached destination for a file (or `undefined` if not cached). */
  public getCachedDestination(path: string): string | null | undefined {
    const entry = this.cache.get(path);
    if (!entry) return undefined;
    if (entry.rulesHash !== this.currentRulesHash) return undefined;
    return entry.matchedDestination;
  }

  /**
   * Store an evaluation result. Clears the dirty flag for this path.
   * `destination` is `null` when no rule matched (file should stay).
   */
  public store(path: string, mtime: number, destination: string | null): void {
    this.dirtyFiles.delete(path);
    this.cache.set(path, {
      mtime,
      matchedDestination: destination,
      rulesHash: this.currentRulesHash,
    });
  }

  /** Drop all cached results (e.g. after a rules/filter change). */
  public invalidateAll(): void {
    this.cache.clear();
    this.dirtyFiles.clear();
  }

  private computeRulesHash(rulesV2: RuleV2[], filters: Filter[]): string {
    try {
      return JSON.stringify({ rulesV2, filters });
    } catch {
      return '';
    }
  }
}
