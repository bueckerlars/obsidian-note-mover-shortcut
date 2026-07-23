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

  it('matches nested tags with includes item', () => {
    const engine = new RuleMatcherV2Engine();
    const rules: RuleV2[] = [
      {
        name: 'tag1-tree',
        destination: 'Tag1',
        aggregation: 'any',
        active: true,
        triggers: [
          {
            criteriaType: 'tag',
            operator: 'includes item',
            value: '#tag1',
          },
        ],
      },
    ];
    const nested = engine.findMatchingRule(
      { ...baseMeta, tags: ['#tag1/tag3'] },
      rules
    );
    expect(nested?.destination).toBe('Tag1');

    const sibling = engine.findMatchingRule(
      { ...baseMeta, tags: ['#tag10'] },
      rules
    );
    expect(sibling).toBeNull();
  });

  it('none start with does not treat #tag1 as under #tag', () => {
    const engine = new RuleMatcherV2Engine();
    const rules: RuleV2[] = [
      {
        name: 'no-tag-prefix',
        destination: 'Ok',
        aggregation: 'any',
        active: true,
        triggers: [
          {
            criteriaType: 'tag',
            operator: 'none start with',
            value: '#tag1',
          },
        ],
      },
    ];
    const hit = engine.findMatchingRule(
      { ...baseMeta, tags: ['#tag10'] },
      rules
    );
    expect(hit?.destination).toBe('Ok');
  });

  it('all start with requires every tag under the rule tag', () => {
    const engine = new RuleMatcherV2Engine();
    const rules: RuleV2[] = [
      {
        name: 'all-under-tag1',
        destination: 'Tag1Only',
        aggregation: 'any',
        active: true,
        triggers: [
          {
            criteriaType: 'tag',
            operator: 'all start with',
            value: '#tag1',
          },
        ],
      },
    ];
    const hit = engine.findMatchingRule(
      { ...baseMeta, tags: ['#tag1', '#tag1/tag2'] },
      rules
    );
    expect(hit?.destination).toBe('Tag1Only');

    const mixed = engine.findMatchingRule(
      { ...baseMeta, tags: ['#tag1', '#other'] },
      rules
    );
    expect(mixed).toBeNull();
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

  describe('folder criteria', () => {
    const rootMeta: FileMetadata = {
      ...baseMeta,
      fileName: 'Note.md',
      filePath: 'Note.md',
    };

    const inboxMeta: FileMetadata = {
      ...baseMeta,
      fileName: 'Note.md',
      filePath: 'Inbox/Note.md',
    };

    function folderRule(
      operator: RuleV2['triggers'][0]['operator'],
      value: string,
      destination = 'Dest'
    ): RuleV2[] {
      return [
        {
          name: 'folder-rule',
          destination,
          aggregation: 'any',
          active: true,
          triggers: [
            {
              criteriaType: 'folder',
              operator,
              value,
            },
          ],
        },
      ];
    }

    it('matches root notes when folder is "/"', () => {
      const engine = new RuleMatcherV2Engine();
      expect(
        engine.findMatchingRule(rootMeta, folderRule('is', '/'))?.destination
      ).toBe('Dest');
    });

    it('matches root notes when folder is ""', () => {
      const engine = new RuleMatcherV2Engine();
      expect(
        engine.findMatchingRule(rootMeta, folderRule('is', ''))?.destination
      ).toBe('Dest');
    });

    it('does not match nested notes when folder is "/"', () => {
      const engine = new RuleMatcherV2Engine();
      expect(
        engine.findMatchingRule(inboxMeta, folderRule('is', '/'))
      ).toBeNull();
    });

    it('matches nested folder with and without leading slash', () => {
      const engine = new RuleMatcherV2Engine();
      expect(
        engine.findMatchingRule(inboxMeta, folderRule('is', 'Inbox'))
          ?.destination
      ).toBe('Dest');
      expect(
        engine.findMatchingRule(inboxMeta, folderRule('is', '/Inbox'))
          ?.destination
      ).toBe('Dest');
    });

    it('starts with "/" matches only root, not every file', () => {
      const engine = new RuleMatcherV2Engine();
      expect(
        engine.findMatchingRule(rootMeta, folderRule('starts with', '/'))
          ?.destination
      ).toBe('Dest');
      expect(
        engine.findMatchingRule(inboxMeta, folderRule('starts with', '/'))
      ).toBeNull();
    });
  });
});
