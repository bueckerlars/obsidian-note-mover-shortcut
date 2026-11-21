import { debugDebug } from '../../utils/debug';

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
    debugDebug(
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
   * Downloads the trace JSON. Uses the file picker when the browser provides one.
   * @returns The file name offered to the user
   */
  async downloadExport(): Promise<string | null> {
    const fileName = `perf-trace-${Date.now()}.json`;
    const json = this.exportJson();
    const view = activeWindow as Window & {
      showSaveFilePicker?: (options: { suggestedName: string }) => Promise<{
        createWritable: () => Promise<{
          write: (data: string) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    };
    if (typeof view.showSaveFilePicker === 'function') {
      try {
        const handle = await view.showSaveFilePicker({
          suggestedName: fileName,
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return fileName;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null;
        }
      }
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = createEl('a');
    link.href = url;
    link.download = fileName;
    activeDocument.body.appendChild(link);
    link.click();
    activeDocument.body.removeChild(link);
    URL.revokeObjectURL(url);
    return fileName;
  }
}
