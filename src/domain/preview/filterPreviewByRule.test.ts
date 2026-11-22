import { describe, expect, it } from 'vitest';
import type { MovePreview, PreviewEntry } from '../../types/MovePreview';
import { filterPreviewByRule } from './filterPreviewByRule';

function entry(path: string, matchedRule?: string): PreviewEntry {
  return {
    fileName: path,
    currentPath: path,
    targetPath: 'X/' + path,
    willBeMoved: true,
    matchedRule,
    tags: [],
  };
}

describe('filterPreviewByRule', () => {
  it('keeps notes matched by that rule only', () => {
    const a = entry('a.md', 'A');
    const b = entry('b.md', 'B');
    const preview: MovePreview = {
      successfulMoves: [a, b],
      analyzed: [a, b, entry('c.md')],
      totalFiles: 3,
      settings: { isFilterWhitelist: false },
    };
    const result = filterPreviewByRule(preview, 'A');
    expect(result.successfulMoves).toEqual([a]);
    expect(result.analyzed).toEqual([a]);
    expect(result.totalFiles).toBe(1);
  });
});
