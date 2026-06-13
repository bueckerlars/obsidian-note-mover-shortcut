import { describe, it, expect } from 'vitest';
import { RuleEvaluationCache } from './RuleEvaluationCache';
import type { RuleV2 } from '../types/RuleV2';

const baseRule: RuleV2 = {
  name: 'Test rule',
  destination: 'inbox',
  aggregation: 'all',
  triggers: [
    {
      criteriaType: 'tag',
      operator: 'includes item',
      value: 'test',
    },
  ],
  active: true,
};

describe('RuleEvaluationCache', () => {
  it('skips evaluation when cache entry matches path, mtime, and rules hash', () => {
    const cache = new RuleEvaluationCache();
    cache.updateRulesHash([baseRule], []);

    cache.store('notes/a.md', 1000, 'inbox');
    expect(cache.needsEvaluation('notes/a.md', 1000)).toBe(false);
    expect(cache.getCachedDestination('notes/a.md')).toBe('inbox');
  });

  it('invalidates all entries when rules hash changes', () => {
    const cache = new RuleEvaluationCache();
    cache.updateRulesHash([baseRule], []);

    cache.store('notes/a.md', 1000, 'inbox');
    expect(cache.needsEvaluation('notes/a.md', 1000)).toBe(false);

    const updatedRule = { ...baseRule, destination: 'archive' };
    cache.updateRulesHash([updatedRule], []);

    expect(cache.needsEvaluation('notes/a.md', 1000)).toBe(true);
    expect(cache.getCachedDestination('notes/a.md')).toBeUndefined();
  });

  it('invalidateAll forces re-evaluation even when rules hash is unchanged', () => {
    const cache = new RuleEvaluationCache();
    cache.updateRulesHash([baseRule], []);

    cache.store('notes/a.md', 1000, 'inbox');
    expect(cache.needsEvaluation('notes/a.md', 1000)).toBe(false);

    cache.invalidateAll();

    expect(cache.needsEvaluation('notes/a.md', 1000)).toBe(true);
    expect(cache.getCachedDestination('notes/a.md')).toBeUndefined();
  });

  it('marks dirty files for re-evaluation without clearing other entries', () => {
    const cache = new RuleEvaluationCache();
    cache.updateRulesHash([baseRule], []);

    cache.store('notes/a.md', 1000, 'inbox');
    cache.store('notes/b.md', 2000, 'tasks');

    cache.markDirty('notes/a.md');

    expect(cache.needsEvaluation('notes/a.md', 1000)).toBe(true);
    expect(cache.needsEvaluation('notes/b.md', 2000)).toBe(false);
  });
});
