import { fill, strings } from '../../i18n/locale';
import type { RuleV2 } from '../../types/RuleV2';
import {
  isRegexOperator,
  operatorRequiresValue,
} from '../../utils/OperatorMapping';
import { createDefaultTrigger } from './ruleEditorShared';

/** Saved rule plus the draft the editor renders. */
export interface RuleEditorSession {
  saved: RuleV2;
  draft: RuleV2;
}

export function openEditor(rule: RuleV2): RuleEditorSession {
  const saved = structuredClone(rule);
  return { saved, draft: structuredClone(saved) };
}

/** Drops the draft and renders the saved rule again. */
export function cancelEditor(session: RuleEditorSession): RuleEditorSession {
  return { saved: session.saved, draft: structuredClone(session.saved) };
}

export function addCondition(rule: RuleV2): RuleV2 {
  return {
    ...rule,
    triggers: [...rule.triggers, createDefaultTrigger()],
  };
}

export function removeCondition(rule: RuleV2, index: number): RuleV2 {
  const triggers = rule.triggers.filter((_, i) => i !== index);
  return {
    ...rule,
    triggers: triggers.length === 0 ? [createDefaultTrigger()] : triggers,
  };
}

/** Returns a new rule whose conditions end with `fromIndex` at `toIndex`. */
export function reorderConditions(
  rule: RuleV2,
  fromIndex: number,
  toIndex: number
): RuleV2 {
  const triggers = rule.triggers;
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= triggers.length ||
    toIndex >= triggers.length
  ) {
    return rule;
  }
  const next = triggers.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return { ...rule, triggers: next };
}

/** @returns an error message, or null when the rule is valid */
export function validateRule(rule: RuleV2): string | null {
  if (!rule.name || rule.name.trim() === '') {
    return strings().modals.ruleEditorNameEmpty;
  }

  if (!rule.destination || rule.destination.trim() === '') {
    return strings().modals.ruleEditorDestinationEmpty;
  }

  if (rule.triggers.length === 0) {
    return strings().modals.ruleEditorConditionRequired;
  }

  for (let i = 0; i < rule.triggers.length; i++) {
    const trigger = rule.triggers[i];
    if (!operatorRequiresValue(trigger.operator)) {
      continue;
    }
    if (!trigger.value || trigger.value.trim() === '') {
      return fill(strings().modals.ruleEditorValueEmpty, { index: i + 1 });
    }
    if (isRegexOperator(trigger.operator)) {
      try {
        new RegExp(trigger.value);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : strings().modals.ruleEditorUnknownError;
        return fill(strings().modals.ruleEditorInvalidRegex, {
          index: i + 1,
          message,
        });
      }
    }
  }

  return null;
}
