import { describe, it, expect } from 'vitest';
import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { PluginVaultIndexCache } from './plugin-vault-index-cache';

function createMockApp(options: {
  getMarkdownFiles?: () => unknown[];
  getFiles?: () => unknown[];
}): App {
  return {
    vault: {
      getMarkdownFiles: options.getMarkdownFiles ?? (() => []),
      getFiles: options.getFiles ?? (() => []),
    },
    metadataCache: {
      getFileCache: () => ({ frontmatter: {} }),
    },
  } as unknown as App;
}

describe('PluginVaultIndexCache', () => {
  it('caches getMarkdownFiles until invalidateMarkdownList', () => {
    let calls = 0;
    const app = createMockApp({
      getMarkdownFiles: () => {
        calls++;
        return [];
      },
    });
    const cache = new PluginVaultIndexCache();
    cache.getMarkdownFilesCached(app);
    cache.getMarkdownFilesCached(app);
    expect(calls).toBe(1);
    cache.invalidateMarkdownList();
    cache.getMarkdownFilesCached(app);
    expect(calls).toBe(2);
  });

  it('caches getMovableFiles until invalidateMovableFileList', () => {
    let calls = 0;
    const md = new TFile();
    md.extension = 'md';
    md.path = 'a.md';
    md.name = 'a.md';
    const canvas = new TFile();
    canvas.extension = 'canvas';
    canvas.path = 'b.canvas';
    canvas.name = 'b.canvas';
    const app = createMockApp({
      getFiles: () => {
        calls++;
        return [md, canvas];
      },
    });
    const cache = new PluginVaultIndexCache();
    const first = cache.getMovableFilesCached(app);
    expect(first.map(f => f.path)).toEqual(['a.md', 'b.canvas']);
    cache.getMovableFilesCached(app);
    expect(calls).toBe(1);
    cache.invalidateMovableFileList();
    cache.getMovableFilesCached(app);
    expect(calls).toBe(2);
  });

  it('clears tag index when markdown list is invalidated', () => {
    const app = createMockApp({ getMarkdownFiles: () => [] });
    const cache = new PluginVaultIndexCache();
    cache.getAllTagsCached(app);
    cache.invalidateMarkdownList();
    cache.getAllTagsCached(app);
    expect(cache.getMarkdownFilesCached(app)).toEqual([]);
  });
});
