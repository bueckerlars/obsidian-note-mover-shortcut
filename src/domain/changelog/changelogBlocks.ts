import type { ChangelogEntry } from '../../generated/changelog';

export const CHANGELOG_SECTION_TYPES = [
  'breaking',
  'features',
  'improvements',
  'bugFixes',
  'changes',
  'fixes',
  'performance',
] as const satisfies readonly (keyof ChangelogEntry['changes'])[];

export type ChangelogSectionType = (typeof CHANGELOG_SECTION_TYPES)[number];

type UnlistedSection = Exclude<
  keyof ChangelogEntry['changes'],
  ChangelogSectionType
>;
const sectionsAreListed: UnlistedSection extends never ? true : never = true;
void sectionsAreListed;

export type ChangelogBlock =
  | { type: 'version'; title: string }
  | { type: ChangelogSectionType; title: string; items: string[] };

export function changelogBlocks(
  entries: readonly ChangelogEntry[],
  labels: {
    version: (version: string) => string;
    sections: Record<ChangelogSectionType, string>;
  }
): ChangelogBlock[] {
  const blocks: ChangelogBlock[] = [];
  for (const entry of entries) {
    blocks.push({
      type: 'version',
      title: labels.version(entry.version),
    });
    for (const type of CHANGELOG_SECTION_TYPES) {
      const items = entry.changes[type];
      if (!items || items.length === 0) {
        continue;
      }
      blocks.push({
        type,
        title: labels.sections[type],
        items,
      });
    }
  }
  return blocks;
}
