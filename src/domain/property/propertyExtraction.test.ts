import { describe, expect, it } from 'vitest';
import { inferPropertyTypeFromSamples } from '../../utils/OperatorMapping';
import {
  collectPropertySamples,
  extractFrontmatterProperties,
  propertyValueStrings,
} from './extractFrontmatterProperties';

describe('extractFrontmatterProperties', () => {
  it('keeps list, string, number, date, empty, and nested values', () => {
    const samples = extractFrontmatterProperties({
      status: 'open',
      count: 2,
      due: '2024-01-02',
      note: '',
      aliases: ['one', 'two'],
      author: { name: 'Ada' },
      tags: ['hidden'],
      position: { start: { line: 0 } },
    });

    expect(samples.get('status')).toEqual(['open']);
    expect(samples.get('count')).toEqual([2]);
    expect(samples.get('due')).toEqual(['2024-01-02']);
    expect(samples.get('note')).toEqual(['']);
    expect(samples.get('aliases')).toEqual([['one', 'two']]);
    expect(samples.get('author.name')).toEqual(['Ada']);
    expect(samples.has('author')).toBe(false);
    expect(samples.has('tags')).toBe(false);
    expect(samples.has('position')).toBe(false);

    expect(inferPropertyTypeFromSamples(samples.get('status') ?? [])).toBe(
      'text'
    );
    expect(inferPropertyTypeFromSamples(samples.get('count') ?? [])).toBe(
      'number'
    );
    expect(inferPropertyTypeFromSamples(samples.get('due') ?? [])).toBe('date');
    expect(inferPropertyTypeFromSamples(samples.get('aliases') ?? [])).toBe(
      'list'
    );
    expect(propertyValueStrings(samples.get('aliases')?.[0])).toEqual([
      'one',
      'two',
    ]);
    expect(propertyValueStrings(samples.get('note')?.[0])).toEqual(['']);
    expect(propertyValueStrings(null)).toEqual([]);
  });

  it('merges the same key from several notes', () => {
    const samples = collectPropertySamples([
      { status: 'open' },
      { status: 'done', count: 1 },
      null,
    ]);
    expect(samples.get('status')).toEqual(['open', 'done']);
    expect(samples.get('count')).toEqual([1]);
  });
});
