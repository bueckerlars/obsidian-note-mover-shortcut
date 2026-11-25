import type {
  ChangelogEntry,
  ReleaseHighlight,
} from '../../generated/changelog';

export const MAX_HIGHLIGHTS = 3;

export interface ReleaseNotes {
  highlights: ReleaseHighlight[];
  fixes: string[];
}

/** "1.5.2" -> "1.5". */
export function shortVersion(version: string): string {
  return /^[^.]*\.[^.]*/.exec(version)?.[0] ?? version;
}

/** Most developer bullets the dialog shows when an entry has no user-facing notes. */
export const MAX_FALLBACK_NOTES = 6;

/** "**Label**: text with `code` and [a link](url)" -> "Label: text with code and a link". */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

/**
 * User-facing notes of the given entries (newest first): top highlights, all fixes.
 * An entry without a Highlights or Release note fixes section would give an empty
 * dialog, so its changelog bullets are shown instead.
 */
export function releaseNotes(entries: readonly ChangelogEntry[]): ReleaseNotes {
  const highlights = entries
    .flatMap(entry => entry.highlights ?? [])
    .slice(0, MAX_HIGHLIGHTS);
  const fixes = entries.flatMap(entry => entry.fixes ?? []);
  if (highlights.length > 0 || fixes.length > 0) {
    return { highlights, fixes };
  }
  const fallback = entries
    .flatMap(({ changes }) => [
      ...(changes.features ?? []),
      ...(changes.improvements ?? []),
      ...(changes.bugFixes ?? []),
      ...(changes.fixes ?? []),
    ])
    .map(plainText)
    .filter(Boolean)
    .slice(0, MAX_FALLBACK_NOTES);
  return { highlights: [], fixes: fallback };
}
