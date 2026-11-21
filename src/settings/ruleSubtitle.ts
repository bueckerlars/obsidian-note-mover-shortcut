import { fill, strings } from '../i18n/locale';
import type { RuleV2 } from '../types/RuleV2';

/** One line: the first condition, then the destination. */
export function ruleSubtitle(rule: RuleV2): string {
  const destination =
    rule.destination.trim() || strings().settings.rulesRowNoDestination;
  const condition = firstCondition(rule);
  const extra = Math.max(0, rule.triggers.length - 1);
  if (!condition) {
    return fill(strings().settings.rulesRowEmpty, { destination });
  }
  if (extra > 0) {
    return fill(strings().settings.rulesRowMore, {
      condition,
      count: extra,
      destination,
    });
  }
  return fill(strings().settings.rulesRowSubtitle, { condition, destination });
}

function firstCondition(rule: RuleV2): string {
  const trigger = rule.triggers[0];
  if (!trigger) {
    return '';
  }
  const labels: Record<string, string> = strings().ruleCriteria;
  const label =
    trigger.criteriaType === 'properties' && trigger.propertyName
      ? trigger.propertyName
      : (labels[trigger.criteriaType] ?? trigger.criteriaType);
  return [label, trigger.operator, trigger.value].filter(Boolean).join(' ');
}
