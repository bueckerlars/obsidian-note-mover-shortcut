import type { PreviewEntry } from '../../types/MovePreview';
import { getParentPath } from '../../utils/PathUtils';
import { previewReasonFor } from './previewReasons';

export type StayCategory = 'no_rule' | 'already_there' | 'excluded' | 'other';

const STAY_CATEGORIES: readonly StayCategory[] = [
  'no_rule',
  'already_there',
  'excluded',
  'other',
];

const NO_MATCH_BLOCK = 'No matching rule found';
const ALREADY_THERE_BLOCK = 'File is already in the correct folder';

/** Why a note that will not move stays where it is. */
export function stayCategory(entry: PreviewEntry): StayCategory {
  if (entry.blockReason === ALREADY_THERE_BLOCK) return 'already_there';
  const reason = previewReasonFor(entry);
  if (reason === 'blacklist') return 'excluded';
  if (
    reason === 'no_match' &&
    (!entry.blockReason || entry.blockReason === NO_MATCH_BLOCK)
  ) {
    return 'no_rule';
  }
  return 'other';
}

interface MoveGroup {
  rule: string;
  destination: string;
  entries: PreviewEntry[];
}

/** One group per rule and resolved destination folder, in order of first appearance. */
export function groupMoves(entries: readonly PreviewEntry[]): MoveGroup[] {
  const groups = new Map<string, MoveGroup>();
  for (const entry of entries) {
    const rule = entry.matchedRule ?? '';
    const destination = entry.targetPath ?? '';
    const key = `${rule}\u0000${destination}`;
    const group = groups.get(key) ?? { rule, destination, entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()];
}

interface StayGroup {
  category: StayCategory;
  entries: PreviewEntry[];
}

/** Non-empty groups in a fixed reason order. */
export function groupStays(entries: readonly PreviewEntry[]): StayGroup[] {
  return STAY_CATEGORIES.map(category => ({
    category,
    entries: entries.filter(entry => stayCategory(entry) === category),
  })).filter(group => group.entries.length > 0);
}

/** Case-insensitive match on the note name, its folder and its destination. */
export function matchesQuery(entry: PreviewEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return [entry.fileName, getParentPath(entry.currentPath), entry.targetPath]
    .filter((text): text is string => Boolean(text))
    .some(text => text.toLowerCase().includes(needle));
}

type CheckState = 'checked' | 'mixed' | 'unchecked';

export function checkState(selected: number, total: number): CheckState {
  if (selected === 0) return 'unchecked';
  return selected === total ? 'checked' : 'mixed';
}

export function noteName(fileName: string): string {
  return fileName.replace(/\.md$/i, '');
}
