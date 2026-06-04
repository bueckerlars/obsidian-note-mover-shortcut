import { getFrontMatterInfo, parseFrontMatterTags, parseYaml } from 'obsidian';
import { extractInlineTagsFromMarkdownBody } from './inline-tags';

export interface MarkdownSnippetMetadata {
  tags: string[];
  properties: Record<string, unknown>;
  links: string[];
  embeds: string[];
  headings: string[];
}

/**
 * Metadata from a markdown fragment (e.g. a canvas text card), aligned with vault note semantics.
 */
export function extractMetadataFromMarkdownSnippet(
  text: string
): MarkdownSnippetMetadata {
  const tags = new Set<string>();
  const properties: Record<string, unknown> = {};
  const links: string[] = [];
  const embeds: string[] = [];
  const headings: string[] = [];

  const fmInfo = getFrontMatterInfo(text);
  let body = text;

  if (fmInfo.exists && fmInfo.frontmatter.trim() !== '') {
    try {
      const frontmatter = parseYaml(fmInfo.frontmatter);
      if (frontmatter && typeof frontmatter === 'object') {
        Object.assign(properties, frontmatter as Record<string, unknown>);
        const fmTags = parseFrontMatterTags(frontmatter);
        if (fmTags) {
          fmTags.forEach(t => tags.add(t));
        }
      }
    } catch {
      // Ignore invalid YAML in canvas cards
    }
    body = text.slice(fmInfo.contentStart);
  }

  for (const tag of extractInlineTagsFromMarkdownBody(body)) {
    tags.add(tag);
  }

  collectWikilinks(body, links, embeds);
  collectHeadings(body, headings);

  return {
    tags: [...tags],
    properties,
    links,
    embeds,
    headings,
  };
}

function collectWikilinks(
  body: string,
  links: string[],
  embeds: string[]
): void {
  const wikiPattern = /(!?)\[\[([^\]|#\]]+)(?:\|[^\]]+)?\]\]/g;
  for (const match of body.matchAll(wikiPattern)) {
    const isEmbed = match[1] === '!';
    const target = match[2].trim();
    if (!target) continue;
    if (isEmbed) {
      embeds.push(target);
    } else {
      links.push(target);
    }
  }
}

function collectHeadings(body: string, headings: string[]): void {
  const headingPattern = /^#{1,6}\s+(.+)$/gm;
  for (const match of body.matchAll(headingPattern)) {
    const heading = match[1].trim();
    if (heading) {
      headings.push(heading);
    }
  }
}
