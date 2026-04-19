import type { App } from 'obsidian';
import { normalizePath } from 'obsidian';

const LOG_PREFIX = '[Advanced Note Mover perf]';

export type PerformanceTraceEntry = {
  /** Monotonic time origin (ms) */
  t0: number;
  /** Wall clock ISO */
  wallTime: string;
  name: string;
  durationMs: number;
  meta?: Record<string, unknown>;
};

/**
 * Collects timing spans when {@link isEnabled} is true; logs to console for quick inspection.
 */
export class PerformanceTraceRecorder {
  private readonly entries: PerformanceTraceEntry[] = [];
  private seq = 0;

  constructor(private readonly isEnabled: () => boolean) {}

  recordSync<T>(name: string, fn: () => T, meta?: Record<string, unknown>): T {
    if (!this.isEnabled()) {
      return fn();
    }
    const start = performance.now();
    const wallTime = new Date().toISOString();
    try {
      return fn();
    } finally {
      const durationMs = performance.now() - start;
      this.pushEntry(name, durationMs, wallTime, start, meta);
    }
  }

  async recordAsync<T>(
    name: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    if (!this.isEnabled()) {
      return fn();
    }
    const start = performance.now();
    const wallTime = new Date().toISOString();
    try {
      return await fn();
    } finally {
      const durationMs = performance.now() - start;
      this.pushEntry(name, durationMs, wallTime, start, meta);
    }
  }

  private pushEntry(
    name: string,
    durationMs: number,
    wallTime: string,
    t0: number,
    meta?: Record<string, unknown>
  ): void {
    const entry: PerformanceTraceEntry = {
      t0,
      wallTime,
      name,
      durationMs,
      meta: meta && Object.keys(meta).length > 0 ? meta : undefined,
    };
    this.seq += 1;
    this.entries.push(entry);
    console.debug(
      `${LOG_PREFIX} #${this.seq} ${name} ${durationMs.toFixed(2)}ms`,
      meta ?? ''
    );
  }

  /** JSON for export / diff. */
  exportJson(): string {
    const payload = {
      plugin: 'obsidian-note-mover-shortcut',
      exportedAt: new Date().toISOString(),
      entryCount: this.entries.length,
      entries: this.entries,
    };
    return JSON.stringify(payload, null, 2);
  }

  clear(): void {
    this.entries.length = 0;
    this.seq = 0;
  }

  /**
   * Writes trace JSON under `_note-mover-traces/` in the vault.
   * @returns Normalized path of the written file
   */
  async writeExportToVault(app: App): Promise<string> {
    const dir = normalizePath('_note-mover-traces');
    const folder = app.vault.getAbstractFileByPath(dir);
    if (!folder) {
      await app.vault.createFolder(dir);
    }
    const fileName = `perf-trace-${Date.now()}.json`;
    const path = normalizePath(`${dir}/${fileName}`);
    await app.vault.adapter.write(path, this.exportJson());
    return path;
  }
}
