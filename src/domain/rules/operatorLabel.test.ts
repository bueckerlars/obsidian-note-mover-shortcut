import { describe, expect, it } from 'vitest';
import en from '../../../languages/en.json';
import de from '../../../languages/de.json';
import { operatorLabel } from './operatorLabel';
import { getOperatorsForCriteriaType } from '../../utils/OperatorMapping';

describe('operatorLabel', () => {
  it('reads operators as plain language and falls back to the operator', () => {
    const labels = en.ruleSummary.operators;
    expect(operatorLabel('includes item', labels)).toBe('includes');
    expect(operatorLabel('does not starts with', labels)).toBe(
      'does not start with'
    );
    expect(operatorLabel('unknown op', labels)).toBe('unknown op');
  });

  it('has a label in every language for every operator', () => {
    for (const type of [
      'tag',
      'fileName',
      'created_at',
      'properties',
    ] as const) {
      for (const op of getOperatorsForCriteriaType(type)) {
        expect(en.ruleSummary.operators).toHaveProperty([op]);
        expect(de.ruleSummary.operators).toHaveProperty([op]);
      }
    }
  });
});
