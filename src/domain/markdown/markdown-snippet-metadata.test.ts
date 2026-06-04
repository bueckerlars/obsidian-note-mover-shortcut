import { describe, expect, it } from 'vitest';
import { extractMetadataFromMarkdownSnippet } from './markdown-snippet-metadata';

describe('extractMetadataFromMarkdownSnippet', () => {
  it('reads frontmatter tags from a canvas text card', () => {
    const meta = extractMetadataFromMarkdownSnippet(`---
tags: [inbox, review]
---
Body with #inline
`);
    expect(meta.tags).toContain('#inbox');
    expect(meta.tags).toContain('#review');
    expect(meta.tags).toContain('#inline');
  });
});
