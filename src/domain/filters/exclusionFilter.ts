export type ExclusionKind =
  'tag' | 'folder' | 'fileName' | 'property' | 'other';

/** Stored filter prefixes, see BlacklistFilterEngine.evaluateCriteria. */
const PREFIX: Record<Exclude<ExclusionKind, 'other'>, string> = {
  tag: 'tag:',
  folder: 'path:',
  fileName: 'fileName:',
  property: 'property:',
};

export const EXCLUSION_KINDS = [
  'tag',
  'folder',
  'fileName',
  'property',
] as const;

interface Exclusion {
  kind: ExclusionKind;
  /** What the user typed. Unknown filter types keep their full text. */
  value: string;
}

export function parseExclusion(raw: string): Exclusion {
  const match = raw.match(/^([a-zA-Z_]+):\s*(.*)$/);
  if (match) {
    for (const kind of EXCLUSION_KINDS) {
      if (PREFIX[kind] === `${match[1]}:`) {
        return { kind, value: match[2] ?? '' };
      }
    }
  }
  return { kind: 'other', value: raw };
}

/** The stored string, or null when the value is blank. */
export function formatExclusion(
  kind: Exclude<ExclusionKind, 'other'>,
  value: string
): string | null {
  const trimmed = value.trim();
  return trimmed ? `${PREFIX[kind]}${trimmed}` : null;
}

export interface CountedSuggestion {
  value: string;
  count: number;
}

/** One count per value, each value counted once per note. */
export function countValues(perNote: string[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const values of perNote) {
    for (const value of new Set(values)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

export function rankSuggestions(
  counts: Map<string, number>,
  query: string,
  limit = 50
): CountedSuggestion[] {
  const needle = query.trim().toLowerCase();
  return [...counts]
    .filter(([value]) => value.toLowerCase().includes(needle))
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}
