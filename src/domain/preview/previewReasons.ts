import type { FileMoveSkipReason } from '../../types/Common';
import { strings } from '../../i18n/locale';

export const FILE_MOVE_SKIP_REASONS = [
  'missing_destination_folder',
  'conflict_skip',
  'cached_conflict_skip',
] as const satisfies readonly FileMoveSkipReason[];

type ListedSkipReason = (typeof FILE_MOVE_SKIP_REASONS)[number];
type UnlistedSkipReason = Exclude<FileMoveSkipReason, ListedSkipReason>;
const skipReasonsAreListed: UnlistedSkipReason extends never ? true : never =
  true;
void skipReasonsAreListed;

export const PREVIEW_MATCH_REASONS = [
  'applied',
  'blacklist',
  'conflict',
  'no_match',
] as const;

export type PreviewMatchReason = (typeof PREVIEW_MATCH_REASONS)[number];

export type PreviewReasonKind = PreviewMatchReason | FileMoveSkipReason;

export interface PreviewReasonSource {
  willBeMoved: boolean;
  matchedRule?: string;
  blockReason?: string;
}

const BLACKLIST_BLOCK = 'Blocked by blacklist filter';
const NO_MATCH_BLOCK = 'No matching rule found';
const MISSING_FOLDER_BLOCK =
  'Destination folder does not exist and auto-create is disabled';

export function previewReasonFor(
  entry: PreviewReasonSource
): PreviewReasonKind {
  if (entry.willBeMoved) {
    return 'applied';
  }
  if (entry.blockReason === BLACKLIST_BLOCK) {
    return 'blacklist';
  }
  if (entry.blockReason === MISSING_FOLDER_BLOCK) {
    return 'missing_destination_folder';
  }
  if (
    entry.blockReason === 'conflict_skip' ||
    entry.blockReason === 'cached_conflict_skip'
  ) {
    return entry.blockReason;
  }
  if (entry.blockReason && /conflict|already exists/i.test(entry.blockReason)) {
    return 'conflict';
  }
  if (entry.blockReason === NO_MATCH_BLOCK || !entry.matchedRule) {
    return 'no_match';
  }
  return 'applied';
}

export function previewReasonText(reason: PreviewReasonKind): string {
  const copy = strings().modals;
  const text: Record<PreviewReasonKind, string> = {
    applied: copy.previewReasonApplied,
    blacklist: copy.previewReasonBlacklist,
    conflict: copy.previewReasonConflict,
    no_match: copy.previewReasonNoMatch,
    missing_destination_folder: copy.previewReasonMissingFolder,
    conflict_skip: copy.previewReasonConflictSkip,
    cached_conflict_skip: copy.previewReasonCachedConflict,
  };
  return text[reason];
}

export function previewRowLabel(entry: PreviewReasonSource): string {
  const reason = previewReasonFor(entry);
  if (reason === 'applied' && entry.matchedRule?.trim()) {
    return entry.matchedRule.trim();
  }
  return previewReasonText(reason);
}
