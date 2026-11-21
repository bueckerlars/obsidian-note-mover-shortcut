import { describe, expect, it } from 'vitest';
import type { RuleV2 } from '../types/RuleV2';
import { ruleSubtitle } from './ruleSubtitle';

function rule(partial: Partial<RuleV2>): RuleV2 {
  return {
    name: 'Inbox',
    destination: 'Projects',
    aggregation: 'all',
    triggers: [],
    active: true,
    ...partial,
  };
}

describe('ruleSubtitle', () => {
  it('shows the condition and the destination', () => {
    expect(
      ruleSubtitle(
        rule({
          triggers: [
            {
              criteriaType: 'tag',
              operator: 'includes item',
              value: '#x',
            },
          ],
        })
      )
    ).toBe('Tag includes item #x → Projects');
  });

  it('counts the conditions after the first', () => {
    expect(
      ruleSubtitle(
        rule({
          triggers: [
            {
              criteriaType: 'tag',
              operator: 'includes item',
              value: '#x',
            },
            {
              criteriaType: 'folder',
              operator: 'contains',
              value: 'inbox',
            },
          ],
        })
      )
    ).toBe('Tag includes item #x, +1 → Projects');
  });
});
