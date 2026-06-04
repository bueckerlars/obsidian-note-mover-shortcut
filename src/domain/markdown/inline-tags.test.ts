import { describe, expect, it } from 'vitest';
import { extractInlineTagsFromMarkdownBody } from './inline-tags';

describe('extractInlineTagsFromMarkdownBody', () => {
  it('extracts inline tags from canvas-style markdown', () => {
    const tags = extractInlineTagsFromMarkdownBody(
      'Project note\n\n#project/active #review'
    );
    expect(tags).toEqual(['#project/active', '#review']);
  });

  it('ignores tags inside fenced code blocks', () => {
    const tags = extractInlineTagsFromMarkdownBody(
      '```\n#not-a-tag\n```\n\n#real-tag'
    );
    expect(tags).toEqual(['#real-tag']);
  });
});
