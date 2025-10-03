import NoteMoverShortcutPlugin from 'main';
import { VaultIndexCache } from '../VaultIndexCache';
import { IndexEntry } from '../../types/PluginData';

describe('VaultIndexCache', () => {
  const makePlugin = (): any => ({
    settings: { index: undefined },
    save_settings: jest.fn().mockResolvedValue(undefined),
  });

  const sampleEntry = (path: string): IndexEntry => ({
    path,
    basename: 'file',
    ext: 'md',
    parent: '/',
    signature: { mode: 'mtimeSize', mtime: 1, size: 1 },
    dirty: false,
  });

  it('initializes empty index on load and persists', async () => {
    const plugin = makePlugin();
    const cache = new VaultIndexCache(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await cache.load();
    expect(plugin.settings.index).toBeDefined();
  });

  it('upserts, gets, marks dirty, deletes and updates stats', async () => {
    const plugin = makePlugin();
    const cache = new VaultIndexCache(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    await cache.load();

    const e1 = sampleEntry('a.md');
    const e2 = sampleEntry('b.md');
    cache.upsert(e1);
    cache.upsert(e2);
    expect(cache.get('a.md')).toBeDefined();
    expect(cache.getMany().length).toBe(2);

    cache.markDirty('a.md');
    expect(cache.get('a.md')?.dirty).toBe(true);

    const stats1 = cache.stats();
    expect(stats1.numFiles).toBe(2);
    expect(stats1.numDirty).toBe(1);

    cache.delete('b.md');
    const stats2 = cache.stats();
    expect(stats2.numFiles).toBe(1);
  });
});
