import type { FileMetadata } from '../../../types/Common';
import type { RuleV2, Trigger } from '../../../types/RuleV2';
import { BlacklistFilterEngine } from '../../filters/blacklist-filter-engine';
import {
  parseExclusion,
  type ExclusionKind,
} from '../../filters/exclusionFilter';
import { resolveDestinationPreview } from '../../templates/resolveDestinationPreview';
import { getParentPath } from '../../../utils/PathUtils';
import { stringifyUnknown } from '../../../utils/stringify-unknown';
import { RuleMatcherV2Engine } from './RuleMatcherV2Engine';

/** Why one condition passed or failed. The UI turns the code into text. */
export type ConditionReason =
  | { code: 'matches' }
  | { code: 'hasTag'; value: string }
  | { code: 'noTags' }
  | { code: 'propertyMissing' }
  | { code: 'propertyIs'; value: string }
  | { code: 'differs' };

export interface ConditionExplanation {
  trigger: Trigger;
  passed: boolean;
  reason: ConditionReason;
}

export interface RuleExplanation {
  rule: RuleV2;
  /** An off rule is not checked. */
  checked: boolean;
  matched: boolean;
  conditions: ConditionExplanation[];
  /** Folder when this is the rule that decides, otherwise null. */
  movesTo: string | null;
}

export interface NoteExplanation {
  excludedBy: { kind: ExclusionKind; value: string } | null;
  rules: RuleExplanation[];
  /** Folder the note would move to, or null when it stays. */
  movesTo: string | null;
}

function reasonFor(
  metadata: FileMetadata,
  trigger: Trigger,
  passed: boolean
): ConditionReason {
  if (passed) return { code: 'matches' };
  if (trigger.criteriaType === 'tag') {
    const first = metadata.tags[0];
    return first ? { code: 'hasTag', value: first } : { code: 'noTags' };
  }
  if (trigger.criteriaType === 'properties' && trigger.propertyName) {
    const actual = metadata.properties[trigger.propertyName];
    if (actual === undefined || actual === null) {
      return { code: 'propertyMissing' };
    }
    return { code: 'propertyIs', value: stringifyUnknown(actual) };
  }
  return { code: 'differs' };
}

function aggregate(rule: RuleV2, passed: boolean[]): boolean {
  if (passed.length === 0) return false;
  if (rule.aggregation === 'any') return passed.some(Boolean);
  if (rule.aggregation === 'none') return !passed.some(Boolean);
  return passed.every(Boolean);
}

/**
 * Explains one note: the exclusion that blocks it, then every rule from the
 * top with the result of each condition. The first matching rule decides.
 * Exclusions are listed but do not stop the rules from being checked.
 */
export function explainNote(
  metadata: FileMetadata,
  rules: readonly RuleV2[],
  exclusions: readonly string[],
  engine = new RuleMatcherV2Engine()
): NoteExplanation {
  const blocking = new BlacklistFilterEngine().getFilterMatchDetails(metadata, [
    ...exclusions,
  ]).blockingFilter;
  let decided = false;
  const explained = rules.map((rule): RuleExplanation => {
    if (!rule.active) {
      return {
        rule,
        checked: false,
        matched: false,
        conditions: [],
        movesTo: null,
      };
    }
    const conditions = rule.triggers.map(trigger => {
      const passed = engine.evaluateTrigger(metadata, trigger);
      return { trigger, passed, reason: reasonFor(metadata, trigger, passed) };
    });
    const matched = aggregate(
      rule,
      conditions.map(c => c.passed)
    );
    const decides = matched && !decided;
    decided ||= matched;
    const movesTo = decides
      ? (resolveDestinationPreview(rule.destination, metadata) ??
        rule.destination)
      : null;
    return { rule, checked: true, matched, conditions, movesTo };
  });
  const target = explained.find(item => item.movesTo !== null)?.movesTo ?? null;
  const here = getParentPath(metadata.filePath);
  return {
    excludedBy: blocking ? parseExclusion(blocking) : null,
    rules: explained,
    movesTo: blocking || target === null || target === here ? null : target,
  };
}
