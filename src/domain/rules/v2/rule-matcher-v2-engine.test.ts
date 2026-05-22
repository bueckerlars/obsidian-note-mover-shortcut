import { describe, it, expect } from 'vitest';
import type { FileMetadata } from '../../../types/Common';
import type { RuleV2 } from '../../../types/RuleV2';
import { RuleMatcherV2Engine } from './RuleMatcherV2Engine';

const baseMeta: FileMetadata = {
  fileName: 'note.md',
  filePath: 'Inbox/note.md',
  tags: [],
  properties: {},
  fileContent: '',
  createdAt: null,
  updatedAt: null,
};

describe('RuleMatcherV2Engine', () => {
  it('finds first active rule by fileName', () => {
    const engine = new RuleMatcherV2Engine();
    const rules: RuleV2[] = [
      {
        name: 'to-proj',
        destination: 'Projects',
        aggregation: 'any',
        active: true,
        triggers: [
          {
            criteriaType: 'fileName',
            operator: 'contains',
            value: 'note',
          },
        ],
      },
    ];
    const hit = engine.findMatchingRule(baseMeta, rules);
    expect(hit?.destination).toBe('Projects');
  });

  it('warmRegexCacheFromRules pre-compiles regex triggers', () => {
    const engine = new RuleMatcherV2Engine();
    const rules: RuleV2[] = [
      {
        name: 'regex-rule',
        destination: 'Out',
        aggregation: 'any',
        active: true,
        triggers: [
          {
            criteriaType: 'fileName',
            operator: 'match regex',
            value: '^note',
          },
        ],
      },
    ];
    engine.warmRegexCacheFromRules(rules);
    const meta: FileMetadata = { ...baseMeta, fileName: 'note.md' };
    expect(engine.findMatchingRule(meta, rules)?.destination).toBe('Out');
  });
});
