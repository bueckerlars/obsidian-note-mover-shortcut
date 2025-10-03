import { TFile, parseFrontMatterTags, parseFrontMatterAliases } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';
import { IndexEntry } from 'src/types/PluginData';

/**
 * MetadataIndexer extracts minimal metadata and computes signatures for files.
 * Content excerpt extraction is optional and size-limited, driven by settings.
 * @since 0.4.7
 */
export class MetadataIndexer {
  constructor(private plugin: NoteMoverShortcutPlugin) {}

  public async indexFile(
    file: TFile,
    mode: 'mtimeSize' | 'hash',
    withContent: boolean
  ): Promise<IndexEntry> {
    const stat: any = (file as any).stat || {};
    const signature = await this.computeSignature(file, mode);
    const meta = await this.extract(file);
    const entry: IndexEntry = {
      path: file.path,
      basename: file.basename,
      ext: file.extension,
      parent: file.parent?.path || '/',
      ctime: stat.ctime,
      mtime: stat.mtime,
      size: stat.size,
      signature,
      meta,
      dirty: false,
      lastIndexedAt: new Date().toISOString(),
    };

    if (withContent) {
      entry.content = await this.extractContent(file);
    }

    return entry;
  }

  public async computeSignature(
    file: TFile,
    mode: 'mtimeSize' | 'hash'
  ): Promise<IndexEntry['signature']> {
    const stat: any = (file as any).stat || {};
    if (mode === 'hash') {
      const content = await this.plugin.app.vault.read(file);
      const hash = await this.hashString(content);
      return { contentHash: hash, mode };
    }
    return { mtime: stat.mtime, size: stat.size, mode };
  }

  public async extract(file: TFile): Promise<IndexEntry['meta']> {
    try {
      const cache = this.plugin.app.metadataCache.getFileCache(file as any);
      const fm = cache?.frontmatter as any;
      const tags = parseFrontMatterTags(fm) || [];
      const aliases = parseFrontMatterAliases(fm) || [];
      return { frontmatter: fm || undefined, tags, aliases };
    } catch {
      return { tags: [], aliases: [] };
    }
  }

  public async extractContent(file: TFile): Promise<IndexEntry['content']> {
    try {
      const maxBytes: number =
        ((this.plugin.settings as any).settings?.indexing
          ?.maxExcerptBytes as any) ?? 0;
      if (!maxBytes || maxBytes <= 0) return {};

      const raw = await this.plugin.app.vault.read(file);
      const excerpt = raw.slice(0, maxBytes);
      // Light headings extraction (fallback if metadata cache not available)
      const headings: string[] = [];
      for (const line of excerpt.split('\n')) {
        if (line.startsWith('#'))
          headings.push(line.replace(/^#+\s*/, '').trim());
      }
      return {
        excerpt,
        headings,
        excerptBytes: excerpt.length,
      };
    } catch {
      return {};
    }
  }

  private async hashString(input: string): Promise<string> {
    try {
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-1', data);
      const bytes = Array.from(new Uint8Array(digest));
      return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback naive hash
      let h = 0;
      for (let i = 0; i < input.length; i++) {
        h = (h << 5) - h + input.charCodeAt(i);
        h |= 0;
      }
      return `${h}`;
    }
  }
}
