import { describe, it, expect } from 'vitest';
import {
  normalizeTagForCompare,
  tagEqualsOrIsChildOf,
  noteHasTag,
} from './tag-hierarchy';

describe('normalizeTagForCompare', () => {
  it('lowercases and ensures leading hash', () => {
    expect(normalizeTagForCompare('TAG')).toBe('#tag');
    expect(normalizeTagForCompare('#Work')).toBe('#work');
  });
});

describe('tagEqualsOrIsChildOf', () => {
  it('matches exact and nested child tags', () => {
    expect(tagEqualsOrIsChildOf('#tag', '#tag')).toBe(true);
    expect(tagEqualsOrIsChildOf('#tag/tag1', '#tag')).toBe(true);
    expect(tagEqualsOrIsChildOf('#TAG/tag2', 'tag')).toBe(true);
    expect(tagEqualsOrIsChildOf('#tag/tag1/deep', '#tag')).toBe(true);
  });

  it('does not match sibling prefix tags', () => {
    expect(tagEqualsOrIsChildOf('#tag1', '#tag')).toBe(false);
    expect(tagEqualsOrIsChildOf('#tagging', '#tag')).toBe(false);
  });

  it('returns false for empty rule tag', () => {
    expect(tagEqualsOrIsChildOf('#tag', '')).toBe(false);
  });
});

describe('noteHasTag', () => {
  it('returns true when any note tag matches hierarchically', () => {
    expect(noteHasTag(['#other', '#tag1/tag3'], '#tag1')).toBe(true);
    expect(noteHasTag(['#tag10'], '#tag1')).toBe(false);
  });
});
