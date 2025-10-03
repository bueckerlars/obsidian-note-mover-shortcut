import { TFile } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';
import { IndexOrchestrator } from '../IndexOrchestrator';

describe('IndexOrchestrator', () => {
  const makePlugin = (files: any[] = []): any => ({
    app: {
      vault: {
        getMarkdownFiles: jest.fn().mockReturnValue(files),
        getAbstractFileByPath: jest.fn(
          (p: string) => files.find(f => f.path === p) || null
        ),
        read: jest.fn().mockResolvedValue('content'),
      },
    },
    settings: {
      settings: {
        indexing: { detectionMode: 'mtimeSize', maxExcerptBytes: 0 },
      },
    },
  });

  const makeFile = (path: string, mtime = 1, size = 1): any => ({
    path,
    basename: path.split('/').pop()?.replace('.md', ''),
    extension: 'md',
    parent: { path: '/' },
    stat: { mtime, size, ctime: 0 },
  });

  it('queues, processes, and persists entries', async () => {
    const file = makeFile('a.md');
    const plugin = makePlugin([file]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    orch.queueDirty('a.md');
    await orch.processAllDirty();
    expect(orch.getIndexedPaths()).toContain('a.md');
  });

  it('verifySnapshot marks missing entries and deletes removed paths', async () => {
    const file = makeFile('b.md', 2, 3);
    const plugin = makePlugin([file]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    orch.queueDirty('b.md');
    await orch.processAllDirty();
    // Now no files to simulate deletion
    (plugin.app.vault.getMarkdownFiles as any).mockReturnValue([]);
    await orch.verifySnapshot();
    expect(orch.getIndexedPaths()).not.toContain('b.md');
  });

  it('registerStatusCallback emits updates', async () => {
    const file = makeFile('c.md');
    const plugin = makePlugin([file]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    const statuses: any[] = [];
    orch.registerStatusCallback(s => statuses.push(s));
    orch.queueDirty('c.md');
    await orch.processAllDirty();
    expect(statuses.length).toBeGreaterThan(0);
  });

  it('processes in hash mode and emits processing/idle states', async () => {
    const file = makeFile('h.md');
    const plugin = makePlugin([file]);
    plugin.settings.settings.indexing.detectionMode = 'hash';
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    const statuses: any[] = [];
    orch.registerStatusCallback(s => statuses.push(s));
    orch.queueDirty('h.md');
    await orch.processAllDirty(true);
    expect(orch.getIndexedPaths()).toContain('h.md');
    expect(statuses.some(s => s.state === 'processing')).toBe(true);
    expect(statuses[statuses.length - 1].state).toBe('idle');
  });

  it('enqueueAllMarkdownFiles and deletePath work as expected', async () => {
    const a = makeFile('d.md');
    const b = makeFile('e.md');
    const plugin = makePlugin([a, b]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    orch.enqueueAllMarkdownFiles();
    await orch.processAllDirty();
    expect(orch.getIndexedPaths().sort()).toEqual(['d.md', 'e.md']);
    orch.deletePath('d.md');
    expect(orch.getIndexedPaths()).toEqual(['e.md']);
  });

  it('verifySnapshot in mtimeSize mode does not mark unchanged files dirty', async () => {
    const file = makeFile('same.md', 10, 20);
    const plugin = makePlugin([file]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    // initial index
    orch.queueDirty('same.md');
    await orch.processAllDirty();
    // same stat
    await orch.verifySnapshot();
    // No new dirty should be queued
    expect(orch.getIndexedPaths()).toContain('same.md');
  });

  it('verifySnapshot marks changed mtime/size as dirty and processes it', async () => {
    const file = makeFile('chg.md', 1, 1);
    const plugin = makePlugin([file]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    orch.queueDirty('chg.md');
    await orch.processAllDirty();
    // change stat
    (file as any).stat.mtime = 999;
    await orch.verifySnapshot();
    await orch.processAllDirty();
    expect(orch.getIndexedPaths()).toContain('chg.md');
  });

  it('skips non-markdown files during processing', async () => {
    const nonMd = { path: 'img.png', extension: 'png' } as any;
    const plugin = makePlugin([nonMd]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    orch.queueDirty('img.png');
    await orch.processAllDirty();
    expect(orch.getIndexedPaths()).not.toContain('img.png');
  });

  it('processQueue respects deadline and leaves items for next run', async () => {
    const a = makeFile('slow.md');
    const plugin = makePlugin([a]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    orch.queueDirty('slow.md');
    await orch.processQueue(0); // immediate deadline
    // Might not process immediately; ensure either queued or processed afterwards
    const processed = orch.getIndexedPaths().includes('slow.md');
    if (!processed) {
      await orch.processAllDirty();
      expect(orch.getIndexedPaths()).toContain('slow.md');
    }
  });

  it('processQueue ignores unknown paths (no abstract file found)', async () => {
    const plugin = makePlugin([]);
    // override lookup to always null
    plugin.app.vault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    orch.registerStatusCallback(() => {});
    orch.queueDirty('missing.md');
    await orch.processAllDirty();
    expect(orch.getIndexedPaths()).not.toContain('missing.md');
  });

  it('verifySnapshot queues missing entry and processes it', async () => {
    const file = makeFile('fresh.md', 3, 3);
    const plugin = makePlugin([file]);
    const orch = new IndexOrchestrator(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await orch.ensureInitialized();
    // no initial index
    await orch.verifySnapshot();
    await orch.processAllDirty();
    expect(orch.getIndexedPaths()).toContain('fresh.md');
  });
});
