import { describe, expect, it } from 'vitest';
import { cloneRule } from './cloneRule';
import type { RuleV2 } from '../types/RuleV2';

function rule(overrides: Partial<RuleV2> = {}): RuleV2 {
  return {
    name: 'Inbox',
    destination: 'Inbox',
    aggregation: 'all',
    triggers: [],
    active: true,
    ...overrides,
  };
}

describe('cloneRule', () => {
  it('ends the name with " copy" and mints a new id when one already exists', () => {
    const source = rule({ id: 'rule-1', name: 'Inbox' });
    const clone = cloneRule(source, [source]);
    expect(clone.name.endsWith(' copy')).toBe(true);
    expect(clone.name).toBe('Inbox copy');
    expect(clone.id).not.toBe(source.id);
    expect(source.id).toBe('rule-1');
  });
});
