/**
 * Minimal stub so Vitest can load modules that import `obsidian`.
 * Not used at runtime in Obsidian.
 */
export class TAbstractFile {}
export class TFile extends TAbstractFile {
  extension = 'md';
  path = '';
  name = '';
}

export function getAllTags(cache: Record<string, unknown>): string[] {
  const tags = cache.tags as { tag: string }[] | undefined;
  if (!tags?.length) return [];
  return tags.map(t => t.tag);
}

export function getFrontMatterInfo(content: string) {
  if (!content.startsWith('---\n')) {
    return {
      exists: false,
      frontmatter: '',
      from: 0,
      to: 0,
      contentStart: 0,
    };
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    return {
      exists: false,
      frontmatter: '',
      from: 0,
      to: 0,
      contentStart: 0,
    };
  }
  return {
    exists: true,
    frontmatter: content.slice(4, end),
    from: 4,
    to: end,
    contentStart: end + 4,
  };
}

export function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^tags:\s*\[(.*)\]\s*$/);
    if (m) {
      result.tags = m[1]
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  return result;
}

export function parseFrontMatterTags(frontmatter: Record<string, unknown>) {
  const raw = frontmatter.tags;
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.map(t => (String(t).startsWith('#') ? String(t) : `#${t}`));
  }
  return null;
}
