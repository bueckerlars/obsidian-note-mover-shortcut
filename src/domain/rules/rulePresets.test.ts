import { describe, expect, it } from 'vitest';
import { presetRule, ruleFromNote } from './rulePresets';

describe('presetRule', () => {
  it('prefills trigger type or destination per preset', () => {
    expect(presetRule('tag', 'N').triggers[0].criteriaType).toBe('tag');
    expect(presetRule('property', 'N').triggers[0].criteriaType).toBe(
      'properties'
    );
    expect(presetRule('date', 'N').destination).toContain(
      '{{file.created.year}}'
    );
    expect(presetRule('blank', 'N').destination).toBe('');
  });
});

describe('ruleFromNote', () => {
  it('adds a condition per tag and text property', () => {
    const rule = ruleFromNote({
      tags: ['#work', '#work/meetings'],
      properties: { status: 'open', tags: ['x'], count: 3, empty: ' ' },
    });
    expect(rule.triggers.map(t => [t.criteriaType, t.value])).toEqual([
      ['tag', '#work'],
      ['tag', '#work/meetings'],
      ['properties', 'open'],
    ]);
    expect(rule.triggers[2].propertyName).toBe('status');
  });

  it('keeps the blank tag condition for a note without metadata', () => {
    expect(ruleFromNote({ tags: [], properties: {} }).triggers).toHaveLength(1);
  });
});
