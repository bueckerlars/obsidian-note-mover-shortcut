import type { RuleV2 } from '../types/RuleV2';

export function cloneRule(rule: RuleV2, existing: readonly RuleV2[]): RuleV2 {
  const clone = structuredClone(rule);
  const baseName = rule.name.trim() || 'Unnamed rule';
  clone.name = `${baseName} copy`;
  if (clone.id && existing.some(item => item.id === clone.id)) {
    clone.id = crypto.randomUUID();
  }
  return clone;
}
