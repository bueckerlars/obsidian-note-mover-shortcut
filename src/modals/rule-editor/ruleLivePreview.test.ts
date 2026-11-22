import { describe, expect, it } from 'vitest';
import type { FileMetadata } from '../../types/Common';
import type { RuleV2 } from '../../types/RuleV2';
import { createRuleLivePreview, findMatchingNotes } from './ruleLivePreview';

function file(name: string): FileMetadata {
  return {
    fileName: name,
    filePath: `Inbox/${name}`,
    tags: [],
    properties: {},
    fileContent: '',
    createdAt: null,
    updatedAt: null,
  };
}

function rule(value: string): RuleV2 {
  return {
    name: 'Names',
    destination: 'Archive',
    aggregation: 'any',
    active: true,
    triggers: [{ criteriaType: 'fileName', operator: 'contains', value }],
  };
}

const files = [file('alpha.md'), file('beta.md'), file('other.md')];

describe('rule live preview', () => {
  it('counts notes the rule matches and keeps the first ones', async () => {
    const { count, samples } = await findMatchingNotes(
      rule('a'),
      files,
      new AbortController().signal
    );
    expect(count).toBe(2);
    expect(samples.map(item => item.fileName)).toEqual(['alpha.md', 'beta.md']);
  });

  it('aborts the previous run when the rule changes again', async () => {
    const preview = createRuleLivePreview(0);
    const first = preview.update(rule('a'), files);
    const second = preview.update(rule('alpha'), files);
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await expect(second).resolves.toMatchObject({ count: 1 });
    preview.dispose();
  });
});
