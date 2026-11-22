import { describe, expect, it } from 'vitest';
import type { RuleV2, Trigger } from '../../types/RuleV2';
import {
  applyCriteriaType,
  applyFolderCreationValue,
  getFolderCreationValue,
} from './ruleEditorShared';

function trigger(value: string): Trigger {
  return { criteriaType: 'tag', operator: 'includes item', value };
}

function rule(overrides: Partial<RuleV2> = {}): RuleV2 {
  return {
    id: 'r1',
    name: 'Rule',
    active: true,
    aggregation: 'all',
    destination: 'Inbox',
    triggers: [trigger('#a')],
    ...overrides,
  } as RuleV2;
}

describe('applyCriteriaType', () => {
  it('resets operator and clears property fields', () => {
    const t: Trigger = {
      criteriaType: 'properties',
      operator: 'is',
      value: 'x',
      propertyName: 'status',
      propertyType: 'text',
    } as Trigger;
    applyCriteriaType(t, 'tag');
    expect(t.criteriaType).toBe('tag');
    expect(t.operator).toBe('includes item');
    expect(t.propertyName).toBeUndefined();
    expect(t.propertyType).toBeUndefined();
  });
});

describe('folder creation value', () => {
  it('round-trips inherit / always / never', () => {
    const r = rule();
    expect(getFolderCreationValue(r)).toBe('inherit');
    applyFolderCreationValue(r, 'always');
    expect(getFolderCreationValue(r)).toBe('always');
    applyFolderCreationValue(r, 'never');
    expect(getFolderCreationValue(r)).toBe('never');
    applyFolderCreationValue(r, 'inherit');
    expect(r.createDestinationFolder).toBeUndefined();
  });
});
