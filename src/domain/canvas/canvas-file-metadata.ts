import type { App, CachedMetadata } from 'obsidian';
import { TFile, getAllTags } from 'obsidian';
import {
  extractMetadataFromMarkdownSnippet,
  type MarkdownSnippetMetadata,
} from '../markdown/markdown-snippet-metadata';

/** Minimal JSON Canvas node shape used for metadata aggregation. */
export interface CanvasJsonNode {
  id?: string;
  type?: string;
  text?: string;
  file?: string;
  label?: string;
}

export interface CanvasJsonDocument {
  nodes?: CanvasJsonNode[];
}

export interface AggregatedCanvasMetadata {
  tags: string[];
  properties: Record<string, unknown>;
  links: string[];
  embeds: string[];
  headings: string[];
}

export function parseCanvasJson(content: string): CanvasJsonDocument | null {
  try {
    const parsed = JSON.parse(content) as CanvasJsonDocument;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Aggregates rule-relevant metadata from all nodes in a `.canvas` file.
 * Text cards contribute tags/properties/links from their markdown; file cards pull vault note cache.
 */
export function extractMetadataFromCanvasJson(
  content: string,
  resolveFileCache?: (path: string) => CachedMetadata | null
): AggregatedCanvasMetadata {
  const doc = parseCanvasJson(content);
  if (!doc?.nodes?.length) {
    return emptyAggregated();
  }

  const tags = new Set<string>();
  const properties: Record<string, unknown> = {};
  const links: string[] = [];
  const embeds: string[] = [];
  const headings: string[] = [];

  for (const node of doc.nodes) {
    if (!node?.type) continue;

    if (node.type === 'text' && typeof node.text === 'string') {
      mergeSnippet(
        extractMetadataFromMarkdownSnippet(node.text),
        tags,
        properties,
        links,
        embeds,
        headings
      );
      continue;
    }

    if (
      node.type === 'file' &&
      typeof node.file === 'string' &&
      resolveFileCache
    ) {
      const cache = resolveFileCache(node.file);
      if (cache) {
        mergeCachedMetadata(cache, tags, properties, links, embeds, headings);
      }
      continue;
    }

    if (
      node.type === 'group' &&
      typeof node.label === 'string' &&
      node.label.trim()
    ) {
      mergeSnippet(
        extractMetadataFromMarkdownSnippet(node.label),
        tags,
        properties,
        links,
        embeds,
        headings
      );
    }
  }

  return {
    tags: [...tags],
    properties,
    links: uniqueStrings(links),
    embeds: uniqueStrings(embeds),
    headings: uniqueStrings(headings),
  };
}

export function extractMetadataFromCanvasFile(
  app: App,
  content: string
): AggregatedCanvasMetadata {
  return extractMetadataFromCanvasJson(content, path => {
    const abstract = app.vault.getAbstractFileByPath(path);
    if (!(abstract instanceof TFile)) {
      return null;
    }
    return app.metadataCache.getFileCache(abstract);
  });
}

function mergeSnippet(
  snippet: MarkdownSnippetMetadata,
  tags: Set<string>,
  properties: Record<string, unknown>,
  links: string[],
  embeds: string[],
  headings: string[]
): void {
  snippet.tags.forEach(t => tags.add(t));
  Object.assign(properties, snippet.properties);
  links.push(...snippet.links);
  embeds.push(...snippet.embeds);
  headings.push(...snippet.headings);
}

function mergeCachedMetadata(
  cache: CachedMetadata,
  tags: Set<string>,
  properties: Record<string, unknown>,
  links: string[],
  embeds: string[],
  headings: string[]
): void {
  const fileTags = getAllTags(cache);
  if (fileTags) {
    fileTags.forEach(t => tags.add(t));
  }
  if (cache.frontmatter) {
    Object.assign(properties, cache.frontmatter);
  }
  if (cache.links) {
    for (const link of cache.links) {
      if (link.link) links.push(link.link);
    }
  }
  if (cache.embeds) {
    for (const embed of cache.embeds) {
      if (embed.link) embeds.push(embed.link);
    }
  }
  if (cache.headings) {
    for (const heading of cache.headings) {
      if (heading.heading) headings.push(heading.heading);
    }
  }
}

function emptyAggregated(): AggregatedCanvasMetadata {
  return {
    tags: [],
    properties: {},
    links: [],
    embeds: [],
    headings: [],
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
