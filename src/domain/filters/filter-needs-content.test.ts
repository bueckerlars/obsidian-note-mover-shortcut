import { describe, it, expect } from 'vitest';
import { filtersNeedContent } from './filter-needs-content';

describe('filtersNeedContent', () => {
  it('returns false for empty or non-content filters', () => {
    expect(filtersNeedContent([])).toBe(false);
    expect(filtersNeedContent(['tag: x'])).toBe(false);
    expect(filtersNeedContent(['  path: foo'])).toBe(false);
  });

  it('detects content: filters (case-insensitive)', () => {
    expect(filtersNeedContent(['content: hello'])).toBe(true);
    expect(filtersNeedContent(['  Content: hello'])).toBe(true);
    expect(filtersNeedContent(['\tCONTENT:foo'])).toBe(true);
  });
});
