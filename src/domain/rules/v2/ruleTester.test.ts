import { describe, expect, it } from 'vitest';
import type { FileMetadata } from '../../../types/Common';
import type { RuleV2, Trigger } from '../../../types/RuleV2';
import { testRules, type FailedCondition } from './ruleTester';

function note(partial: Pick<FileMetadata, 'fileName' | 'tags'>): FileMetadata {
  return {
    fileName: partial.fileName,
    filePath: partial.fileName,
    tags: partial.tags,
    properties: {},
    fileContent: '',
    createdAt: null,
    updatedAt: null,
  };
}

function rule(
  name: string,
  aggregation: RuleV2['aggregation'],
  triggers: Trigger[],
  active = true
): RuleV2 {
  return {
    name,
    destination: 'Sorted',
    aggregation,
    triggers,
    active,
  };
}

const inbox = note({ fileName: 'Note.md', tags: ['#inbox'] });
const daily = note({ fileName: 'Daily.md', tags: [] });

const inboxRule = rule('Inbox', 'all', [
  { criteriaType: 'tag', operator: 'includes item', value: '#inbox' },
]);
const dailyRule = rule('Daily', 'all', [
  { criteriaType: 'fileName', operator: 'starts with', value: 'Daily' },
]);

const samples: {
  note: FileMetadata;
  rule: RuleV2;
  matched: boolean;
  failed: FailedCondition | null;
}[] = [
  { note: inbox, rule: inboxRule, matched: true, failed: null },
  {
    note: inbox,
    rule: dailyRule,
    matched: false,
    failed: {
      criteriaType: 'fileName',
      operator: 'starts with',
      value: 'Daily',
    },
  },
  {
    note: daily,
    rule: inboxRule,
    matched: false,
    failed: {
      criteriaType: 'tag',
      operator: 'includes item',
      value: '#inbox',
    },
  },
  { note: daily, rule: dailyRule, matched: true, failed: null },
  {
    note: inbox,
    rule: rule('Either', 'any', [
      { criteriaType: 'tag', operator: 'includes item', value: '#later' },
      { criteriaType: 'tag', operator: 'includes item', value: '#inbox' },
    ]),
    matched: true,
    failed: null,
  },
  {
    note: daily,
    rule: rule('Either', 'any', [
      { criteriaType: 'tag', operator: 'includes item', value: '#inbox' },
      { criteriaType: 'fileName', operator: 'starts with', value: 'Weekly' },
    ]),
    matched: false,
    failed: {
      criteriaType: 'tag',
      operator: 'includes item',
      value: '#inbox',
    },
  },
  {
    note: daily,
    rule: rule('Not inbox', 'none', [
      { criteriaType: 'tag', operator: 'includes item', value: '#inbox' },
    ]),
    matched: true,
    failed: null,
  },
  {
    note: inbox,
    rule: rule('Not inbox', 'none', [
      { criteriaType: 'tag', operator: 'includes item', value: '#inbox' },
    ]),
    matched: false,
    failed: {
      criteriaType: 'tag',
      operator: 'includes item',
      value: '#inbox',
    },
  },
  {
    note: inbox,
    rule: rule('Paused', 'all', inboxRule.triggers, false),
    matched: false,
    failed: null,
  },
];

describe('testRules', () => {
  it('maps sample notes to the expected match or reason', () => {
    for (const sample of samples) {
      const [result] = testRules(sample.note, [sample.rule]);
      expect(result?.matched, sample.rule.name).toBe(sample.matched);
      expect(result?.failedCondition, sample.rule.name).toEqual(sample.failed);
    }
  });
});
