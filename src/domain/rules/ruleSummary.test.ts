import { describe, expect, it } from 'vitest';
import type { RuleV2 } from '../../types/RuleV2';
import {
  buildRuleSummary,
  plainOperator,
  summaryText,
  type SummaryLabels,
} from './ruleSummary';

const labels: SummaryLabels = {
  name: 'name',
  folder: 'folder',
  created: 'created',
  modified: 'modified',
  extension: 'extension',
  links: 'links to',
  embeds: 'embeds',
  heading: 'heading',
  and: 'and',
  or: 'or',
  andNot: 'and not',
  noCondition: 'No condition',
  noDestination: 'No destination',
};

function rule(partial: Partial<RuleV2>): RuleV2 {
  return {
    name: 'R',
    destination: 'Work/Meetings/{{file.created.year}}',
    aggregation: 'all',
    triggers: [],
    active: true,
    ...partial,
  };
}

describe('buildRuleSummary', () => {
  it('joins conditions and splits template tokens', () => {
    const segments = buildRuleSummary(
      rule({
        triggers: [
          { criteriaType: 'tag', operator: 'includes item', value: 'meeting' },
          {
            criteriaType: 'properties',
            operator: 'is',
            value: 'done',
            propertyName: 'status',
          },
        ],
      }),
      labels
    );
    expect(segments).toEqual([
      { kind: 'icon', icon: 'tag' },
      { kind: 'value', text: '#meeting' },
      { kind: 'joiner', text: 'and' },
      { kind: 'icon', icon: 'text' },
      { kind: 'value', text: 'status' },
      { kind: 'text', text: 'is' },
      { kind: 'value', text: 'done' },
      { kind: 'arrow' },
      { kind: 'value', text: 'Work/Meetings/' },
      { kind: 'token', text: '{{file.created.year}}' },
    ]);
  });

  it('uses or and and not joiners', () => {
    const triggers = [
      {
        criteriaType: 'tag' as const,
        operator: 'includes item' as const,
        value: '#a',
      },
      {
        criteriaType: 'fileName' as const,
        operator: 'starts with' as const,
        value: 'Book',
      },
    ];
    const any = summaryText(
      buildRuleSummary(rule({ aggregation: 'any', triggers }), labels)
    );
    expect(any).toContain('#a or name starts with Book');
    const none = summaryText(
      buildRuleSummary(rule({ aggregation: 'none', triggers }), labels)
    );
    expect(none).toContain('and not');
  });

  it('handles empty conditions and destination', () => {
    expect(
      summaryText(buildRuleSummary(rule({ destination: ' ' }), labels))
    ).toBe('No condition No destination');
  });

  it('writes operators in plain language', () => {
    expect(plainOperator('includes item')).toBe('includes');
    expect(plainOperator('does not include item')).toBe('does not include');
    expect(plainOperator('starts with')).toBe('starts with');
  });
});
