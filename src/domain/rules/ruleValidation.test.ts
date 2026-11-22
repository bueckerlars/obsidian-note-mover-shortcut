import { describe, expect, it } from 'vitest';
import type { RuleV2, Trigger } from '../../types/RuleV2';
import { validateRuleFields } from './ruleValidation';

function rule(overrides: Partial<RuleV2> = {}): RuleV2 {
  const trigger: Trigger = {
    criteriaType: 'tag',
    operator: 'includes item',
    value: '#a',
  };
  return {
    name: 'Rule',
    active: true,
    aggregation: 'all',
    destination: 'Inbox',
    triggers: [trigger],
    ...overrides,
  };
}

describe('validateRuleFields', () => {
  it('accepts a valid rule', () => {
    const issues = validateRuleFields(rule());
    expect(issues.nameEmpty).toBe(false);
    expect(issues.destination).toBeNull();
    expect(issues.conditions).toEqual([null]);
  });

  it('reports a blank name, empty destination and empty value', () => {
    const issues = validateRuleFields(
      rule({
        name: ' ',
        destination: '',
        triggers: [
          { criteriaType: 'tag', operator: 'includes item', value: '' },
        ],
      })
    );
    expect(issues.nameEmpty).toBe(true);
    expect(issues.destination).toBe('empty');
    expect(issues.conditions).toEqual([{ kind: 'valueEmpty' }]);
  });

  it('reports unknown placeholders and bad regex', () => {
    const issues = validateRuleFields(
      rule({
        destination: 'Work/{{year}}',
        triggers: [
          { criteriaType: 'fileName', operator: 'match regex', value: '(' },
        ],
      })
    );
    expect(issues.destination).toBe('placeholder');
    expect(issues.conditions[0]?.kind).toBe('invalidRegex');
  });

  it('does not need a value for operators without one', () => {
    const issues = validateRuleFields(
      rule({
        triggers: [
          {
            criteriaType: 'properties',
            operator: 'has any value',
            value: '',
            propertyName: 'status',
          },
        ],
      })
    );
    expect(issues.conditions).toEqual([null]);
  });
});
