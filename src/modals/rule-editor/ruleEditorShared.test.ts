import { describe, expect, it } from 'vitest';
import type { RuleV2, Trigger } from '../../types/RuleV2';
import {
  applyCriteriaType,
  applyFolderCreationValue,
  createDefaultTrigger,
  getFolderCreationValue,
  moveTrigger,
  removeTrigger,
  validateRule,
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

describe('moveTrigger', () => {
  it('moves a trigger to the target index', () => {
    const triggers = [trigger('a'), trigger('b'), trigger('c')];
    moveTrigger(triggers, 0, 2);
    expect(triggers.map(t => t.value)).toEqual(['b', 'c', 'a']);
    moveTrigger(triggers, 2, 0);
    expect(triggers.map(t => t.value)).toEqual(['a', 'b', 'c']);
  });

  it('ignores out-of-range moves', () => {
    const triggers = [trigger('a'), trigger('b')];
    moveTrigger(triggers, 0, -1);
    moveTrigger(triggers, 1, 2);
    expect(triggers.map(t => t.value)).toEqual(['a', 'b']);
  });
});

describe('removeTrigger', () => {
  it('keeps one default trigger when the last one is removed', () => {
    const triggers = [trigger('a')];
    removeTrigger(triggers, 0);
    expect(triggers).toEqual([createDefaultTrigger()]);
  });
});

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

describe('validateRule', () => {
  it('accepts a valid rule', () => {
    expect(validateRule(rule())).toBeNull();
  });

  it('reports missing name, destination and values', () => {
    expect(validateRule(rule({ name: ' ' }))).toMatch(/name/);
    expect(validateRule(rule({ destination: '' }))).toMatch(/Destination/);
    expect(validateRule(rule({ triggers: [trigger('')] }))).toMatch(
      /Condition 1/
    );
  });

  it('reports invalid regex patterns', () => {
    const t: Trigger = {
      criteriaType: 'fileName',
      operator: 'match regex',
      value: '(',
    } as Trigger;
    expect(validateRule(rule({ triggers: [t] }))).toMatch(/regex/);
  });
});
