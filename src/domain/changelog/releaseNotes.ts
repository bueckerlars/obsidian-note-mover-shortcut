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
  return version.split('.').slice(0, 2).join('.');
}

/** User-facing notes of the given entries (newest first): top highlights, all fixes. */
export function releaseNotes(entries: readonly ChangelogEntry[]): ReleaseNotes {
  return {
    highlights: entries
      .flatMap(entry => entry.highlights ?? [])
      .slice(0, MAX_HIGHLIGHTS),
    fixes: entries.flatMap(entry => entry.fixes ?? []),
  };
}
