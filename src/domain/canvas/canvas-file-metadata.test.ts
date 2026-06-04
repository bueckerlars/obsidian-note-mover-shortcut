import type { CachedMetadata } from 'obsidian';
import { describe, expect, it } from 'vitest';
import { extractMetadataFromCanvasJson } from './canvas-file-metadata';

describe('extractMetadataFromCanvasJson', () => {
  it('aggregates tags from text nodes for canvas rule matching', () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'a',
          type: 'text',
          text: 'New idea\n\n#inbox #canvas-work',
        },
        {
          id: 'b',
          type: 'text',
          text: 'More context with #inbox/urgent',
        },
      ],
    });

    const meta = extractMetadataFromCanvasJson(canvas);
    expect(meta.tags).toContain('#inbox');
    expect(meta.tags).toContain('#canvas-work');
    expect(meta.tags).toContain('#inbox/urgent');
  });

  it('merges metadata from embedded vault notes via file nodes', () => {
    const canvas = JSON.stringify({
      nodes: [
        {
          id: 'f1',
          type: 'file',
          file: 'notes/seed.md',
        },
      ],
    });

    const meta = extractMetadataFromCanvasJson(
      canvas,
      () =>
        ({
          tags: [{ tag: '#from-note', position: 0 }],
          frontmatter: { status: 'active' },
          links: [{ link: 'MOC', position: 0 }],
          embeds: [{ link: 'image.png', position: 0 }],
          headings: [{ heading: 'Intro', level: 1, position: 0 }],
        }) as unknown as CachedMetadata
    );

    expect(meta.tags).toEqual(['#from-note']);
    expect(meta.properties).toEqual({ status: 'active' });
    expect(meta.links).toEqual(['MOC']);
    expect(meta.embeds).toEqual(['image.png']);
    expect(meta.headings).toEqual(['Intro']);
  });

  it('returns empty metadata for invalid JSON', () => {
    expect(extractMetadataFromCanvasJson('not json').tags).toEqual([]);
  });
});
