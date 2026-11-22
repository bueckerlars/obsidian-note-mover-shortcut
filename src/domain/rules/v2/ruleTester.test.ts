import { describe, expect, it } from 'vitest';
import type { FileMetadata } from '../../../types/Common';
import type { RuleV2, Trigger } from '../../../types/RuleV2';
import { explainNote } from './ruleTester';

function note(partial: Partial<FileMetadata>): FileMetadata {
  return {
    fileName: 'Draft idea.md',
    filePath: 'Inbox/Draft idea.md',
    tags: [],
    properties: {},
    fileContent: '',
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

function rule(
  name: string,
  aggregation: RuleV2['aggregation'],
  triggers: Trigger[],
  destination = 'Sorted',
  active = true
): RuleV2 {
  return { name, destination, aggregation, triggers, active };
}

const tag = (value: string): Trigger => ({
  criteriaType: 'tag',
  operator: 'includes item',
  value,
});
const prop = (propertyName: string, value: string): Trigger => ({
  criteriaType: 'properties',
  operator: 'is',
  propertyName,
  value,
});

describe('explainNote', () => {
  it('explains each condition with a reason', () => {
    const [meeting, project, ideas] = explainNote(
      note({ tags: ['#draft'], properties: { status: 'open' } }),
      [
        rule('Meeting', 'all', [tag('#meeting'), prop('status', 'done')]),
        rule('Project', 'any', [prop('project', 'Apollo')]),
        rule(
          'Ideas',
          'all',
          [{ criteriaType: 'fileName', operator: 'contains', value: 'idea' }],
          'Ideas'
        ),
      ],
      []
    ).rules;
    expect(meeting.matched).toBe(false);
    expect(meeting.conditions.map(c => c.reason)).toEqual([
      { code: 'hasTag', value: '#draft' },
      { code: 'propertyIs', value: 'open' },
    ]);
    expect(project.conditions[0].reason).toEqual({ code: 'propertyMissing' });
    expect(ideas.matched).toBe(true);
    expect(ideas.conditions[0].reason).toEqual({ code: 'matches' });
    expect(ideas.movesTo).toBe('Ideas');
  });

  it('reports a tagless note', () => {
    const { rules } = explainNote(
      note({}),
      [rule('A', 'all', [tag('#a')])],
      []
    );
    expect(rules[0].conditions[0].reason).toEqual({ code: 'noTags' });
  });

  it('applies match modes', () => {
    const either = rule('Either', 'any', [tag('#x'), tag('#y')]);
    const none = rule('None', 'none', [tag('#x')]);
    const empty = rule('Empty', 'all', []);
    const result = explainNote(
      note({ tags: ['#y'] }),
      [either, none, empty],
      []
    );
    expect(result.rules.map(r => r.matched)).toEqual([true, true, false]);
  });

  it('only the first match decides, off rules are not checked', () => {
    const result = explainNote(
      note({ tags: ['#a'] }),
      [
        rule('Off', 'all', [tag('#a')], 'Off', false),
        rule('First', 'all', [tag('#a')], 'One'),
        rule('Second', 'all', [tag('#a')], 'Two'),
      ],
      []
    );
    expect(result.rules[0]).toMatchObject({ checked: false, movesTo: null });
    expect(result.rules.map(r => r.movesTo)).toEqual([null, 'One', null]);
    expect(result.movesTo).toBe('One');
  });

  it('stays when excluded, and names the exclusion', () => {
    const result = explainNote(
      note({ tags: ['#draft', '#a'] }),
      [rule('A', 'all', [tag('#a')])],
      ['tag:#draft']
    );
    expect(result.excludedBy).toEqual({ kind: 'tag', value: '#draft' });
    expect(result.rules[0].matched).toBe(true);
    expect(result.movesTo).toBeNull();
  });

  it('stays when the note is already in the destination', () => {
    const result = explainNote(
      note({ tags: ['#a'] }),
      [rule('A', 'all', [tag('#a')], 'Inbox')],
      []
    );
    expect(result.movesTo).toBeNull();
  });
});
