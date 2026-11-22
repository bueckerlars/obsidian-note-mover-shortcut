import type { RuleV2 } from '../../types/RuleV2';
import {
  isRegexOperator,
  operatorRequiresValue,
} from '../../utils/OperatorMapping';
import { findPlaceholderProblems } from '../templates/placeholderValidation';

export type ConditionIssue =
  { kind: 'valueEmpty' } | { kind: 'invalidRegex'; message: string } | null;

export interface RuleIssues {
  nameEmpty: boolean;
  destination: 'empty' | 'placeholder' | null;
  /** One entry per condition, in order. */
  conditions: ConditionIssue[];
}

function conditionIssue(trigger: RuleV2['triggers'][number]): ConditionIssue {
  if (!operatorRequiresValue(trigger.operator)) return null;
  if (!trigger.value || trigger.value.trim() === '') {
    return { kind: 'valueEmpty' };
  }
  if (isRegexOperator(trigger.operator)) {
    try {
      new RegExp(trigger.value);
    } catch (error) {
      return {
        kind: 'invalidRegex',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return null;
}

/** Field-level problems of a rule, so the editor can mark each field. */
export function validateRuleFields(rule: RuleV2): RuleIssues {
  const destination = rule.destination?.trim() ?? '';
  return {
    nameEmpty: !rule.name || rule.name.trim() === '',
    destination: !destination
      ? 'empty'
      : findPlaceholderProblems(destination).length > 0
        ? 'placeholder'
        : null,
    conditions: rule.triggers.map(conditionIssue),
  };
}
