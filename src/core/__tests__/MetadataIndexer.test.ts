import { TFile } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';
import { MetadataIndexer } from '../MetadataIndexer';

describe('MetadataIndexer', () => {
  const makePlugin = (content = 'Hello\n# Title\nBody'): any => ({
    app: {
      vault: {
        read: jest.fn().mockResolvedValue(content),
      },
      metadataCache: {
        getFileCache: jest
          .fn()
          .mockReturnValue({ frontmatter: { tags: ['a'], aliases: ['x'] } }),
      },
    },
    settings: { settings: { indexing: { maxExcerptBytes: 5 } } },
  });

  const makeFile = (): any => ({
    path: 'a.md',
    basename: 'a',
    extension: 'md',
    parent: { path: '/' },
    stat: { mtime: 1, size: 2, ctime: 0 },
  });

  it('computes mtimeSize signature and extracts meta', async () => {
    const indexer = new MetadataIndexer(
      makePlugin() as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const entry = await indexer.indexFile(file, 'mtimeSize', false);
    expect(entry.signature.mode).toBe('mtimeSize');
    expect(entry.meta?.tags?.length).toBeGreaterThanOrEqual(0);
  });

  it('extracts content excerpt when enabled', async () => {
    const indexer = new MetadataIndexer(
      makePlugin('abcdef') as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const entry = await indexer.indexFile(file, 'mtimeSize', true);
    expect(entry.content?.excerpt).toBeDefined();
  });

  it('computes hash signature when detection mode is hash', async () => {
    const plugin = makePlugin('contentX');
    const indexer = new MetadataIndexer(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const sig = await indexer.computeSignature(file, 'hash');
    expect(sig.mode).toBe('hash');
    expect(typeof sig.contentHash).toBe('string');
  });

  it('does not include excerpt when maxExcerptBytes is 0', async () => {
    const plugin = makePlugin('abcdef');
    plugin.settings.settings.indexing.maxExcerptBytes = 0;
    const indexer = new MetadataIndexer(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const entry = await indexer.indexFile(file, 'mtimeSize', true);
    expect(entry.content?.excerpt).toBeUndefined();
  });

  it('falls back to simple hash when WebCrypto is unavailable', async () => {
    const plugin = makePlugin('abcdef');
    const indexer = new MetadataIndexer(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const originalCrypto = (global as any).crypto;
    (global as any).crypto = {
      subtle: { digest: jest.fn().mockRejectedValue(new Error('no subtle')) },
    } as any;
    const sig = await indexer.computeSignature(file, 'hash');
    expect(sig.mode).toBe('hash');
    expect(typeof sig.contentHash).toBe('string');
    (global as any).crypto = originalCrypto;
  });

  it('returns meta with empty arrays when metadata cache access fails', async () => {
    const plugin = makePlugin('abc');
    plugin.app.metadataCache.getFileCache = jest.fn().mockImplementation(() => {
      throw new Error('cache error');
    });
    const indexer = new MetadataIndexer(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const meta = await indexer.extract(file);
    expect(Array.isArray(meta?.tags)).toBe(true);
    expect(Array.isArray(meta?.aliases)).toBe(true);
  });

  it('extracts headings from excerpt when present', async () => {
    const plugin = makePlugin('# Title\nBody');
    plugin.settings.settings.indexing.maxExcerptBytes = 100;
    const indexer = new MetadataIndexer(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const entry = await indexer.indexFile(file, 'mtimeSize', true);
    expect(entry.content?.headings?.includes('Title')).toBe(true);
  });

  it('computeSignature returns mtime and size in mtimeSize mode', async () => {
    const plugin = makePlugin();
    const indexer = new MetadataIndexer(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const sig = await indexer.computeSignature(file, 'mtimeSize');
    expect(sig.mtime).toBeDefined();
    expect(sig.size).toBeDefined();
    expect(sig.mode).toBe('mtimeSize');
  });

  it('indexFile without content does not attach content field', async () => {
    const plugin = makePlugin('abcdef');
    const indexer = new MetadataIndexer(
      plugin as unknown as NoteMoverShortcutPlugin
    );
    const file = makeFile() as unknown as TFile;
    const entry = await indexer.indexFile(file, 'mtimeSize', false);
    expect(entry.content).toBeUndefined();
  });
});
