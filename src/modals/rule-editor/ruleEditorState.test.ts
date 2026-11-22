import { describe, expect, it } from 'vitest';
import type { RuleV2, Trigger } from '../../types/RuleV2';
import { createDefaultTrigger } from './ruleEditorShared';
import {
  addCondition,
  cancelEditor,
  openEditor,
  removeCondition,
  reorderConditions,
} from './ruleEditorState';

function trigger(value: string): Trigger {
  return { criteriaType: 'tag', operator: 'includes item', value };
}

function rule(): RuleV2 {
  return {
    id: 'r1',
    name: 'Rule',
    active: true,
    aggregation: 'all',
    destination: 'Inbox',
    triggers: [trigger('a'), trigger('b'), trigger('c')],
  };
}

describe('rule editor state', () => {
  it('adds a condition without changing the previous list', () => {
    const current = rule();
    const next = addCondition(current);
    expect(current.triggers.map(item => item.value)).toEqual(['a', 'b', 'c']);
    expect(next.triggers.map(item => item.value)).toEqual(['a', 'b', 'c', '']);
    expect(next.triggers[3]).toEqual(createDefaultTrigger());
  });

  it('removes a condition and keeps one default when the last one goes', () => {
    const current = rule();
    const next = removeCondition(current, 1);
    expect(current.triggers.map(item => item.value)).toEqual(['a', 'b', 'c']);
    expect(next.triggers.map(item => item.value)).toEqual(['a', 'c']);

    const emptied = removeCondition(
      removeCondition(removeCondition(next, 0), 0),
      0
    );
    expect(emptied.triggers).toEqual([createDefaultTrigger()]);
  });

  it('reorders conditions by returning a new list', () => {
    const current = rule();
    const next = reorderConditions(current, 0, 2);
    expect(current.triggers.map(item => item.value)).toEqual(['a', 'b', 'c']);
    expect(next.triggers.map(item => item.value)).toEqual(['b', 'c', 'a']);
    expect(
      reorderConditions(next, 2, 0).triggers.map(item => item.value)
    ).toEqual(['a', 'b', 'c']);
    expect(reorderConditions(current, 0, -1)).toBe(current);
  });

  it('restores the saved rule on cancel', () => {
    const source = rule();
    const session = openEditor(source);
    session.draft.name = 'Changed';
    const edited = {
      saved: session.saved,
      draft: addCondition(session.draft),
    };
    expect(edited.draft.name).toBe('Changed');
    expect(edited.draft.triggers).toHaveLength(4);

    const restored = cancelEditor(edited);
    expect(restored.draft).toEqual(session.saved);
    expect(restored.draft).not.toBe(session.saved);
    expect(source.name).toBe('Rule');
    expect(source.triggers).toHaveLength(3);
  });
});
