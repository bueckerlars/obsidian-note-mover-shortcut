import { describe, expect, it } from 'vitest';
import { presetRule } from './rulePresets';

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
