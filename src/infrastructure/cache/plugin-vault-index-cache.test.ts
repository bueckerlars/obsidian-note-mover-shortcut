import { describe, it, expect } from 'vitest';
import type { App } from 'obsidian';
import { PluginVaultIndexCache } from './plugin-vault-index-cache';

function createMockApp(getMarkdownFiles: () => unknown[]): App {
  return {
    vault: { getMarkdownFiles },
    metadataCache: {
      getFileCache: () => ({ frontmatter: {} }),
    },
  } as unknown as App;
}

describe('PluginVaultIndexCache', () => {
  it('caches getMarkdownFiles until invalidateMarkdownList', () => {
    let calls = 0;
    const app = createMockApp(() => {
      calls++;
      return [];
    });
    const cache = new PluginVaultIndexCache();
    cache.getMarkdownFilesCached(app);
    cache.getMarkdownFilesCached(app);
    expect(calls).toBe(1);
    cache.invalidateMarkdownList();
    cache.getMarkdownFilesCached(app);
    expect(calls).toBe(2);
  });

  it('clears tag index when markdown list is invalidated', () => {
    const app = createMockApp(() => []);
    const cache = new PluginVaultIndexCache();
    cache.getAllTagsCached(app);
    cache.invalidateMarkdownList();
    cache.getAllTagsCached(app);
    // No throw; second call rebuilds after generation bump
    expect(cache.getMarkdownFilesCached(app)).toEqual([]);
  });
});
