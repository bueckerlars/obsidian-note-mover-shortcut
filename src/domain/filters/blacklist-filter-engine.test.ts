import { describe, it, expect } from 'vitest';
import type { FileMetadata } from '../../types/Common';
import { BlacklistFilterEngine } from './blacklist-filter-engine';

function meta(partial: Partial<FileMetadata>): FileMetadata {
  return {
    fileName: 'n.md',
    filePath: 'Inbox/n.md',
    tags: ['#work'],
    properties: {},
    fileContent: '',
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

describe('BlacklistFilterEngine', () => {
  const engine = new BlacklistFilterEngine();

  it('passes when filter list is empty', () => {
    expect(engine.evaluateFilter(meta({}), [])).toBe(true);
  });

  it('blocks when tag filter matches', () => {
    expect(
      engine.evaluateFilter(meta({ tags: ['#inbox'] }), ['tag: #inbox'])
    ).toBe(false);
  });

  it('getFilterMatchDetails returns blocking filter', () => {
    const d = engine.getFilterMatchDetails(meta({ tags: ['#x'] }), ['tag: #x']);
    expect(d.passes).toBe(false);
    expect(d.blockingFilter).toBe('tag: #x');
  });
});
