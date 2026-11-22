import { describe, expect, it } from 'vitest';
import {
  buildHistoryView,
  historyRuleNames,
  historySince,
  type HistorySource,
  type HistoryViewOptions,
} from './historyGrouping';

const now = new Date(2026, 10, 22, 12, 0).getTime();
const at = (day: number, hour: number): number =>
  new Date(2026, 10, day, hour, 5).getTime();

function entry(
  id: string,
  timestamp: number,
  extra: Partial<HistorySource> = {}
): HistorySource {
  return {
    id,
    timestamp,
    fileName: `${id}.md`,
    sourcePath: `Inbox/${id}.md`,
    destinationPath: `Archive/${id}.md`,
    ...extra,
  };
}

const view = (
  entries: HistorySource[],
  extra: Partial<HistoryViewOptions> = {}
) =>
  buildHistoryView(entries, [{ id: 'op', operationType: 'periodic' }], {
    query: '',
    rule: null,
    range: 'all',
    now,
    rootLabel: 'root',
    ...extra,
  });

describe('buildHistoryView', () => {
  it('lists folders only, drops .md and groups by day newest first', () => {
    const days = view([
      entry('old', at(20, 23)),
      entry('new', at(22, 9), { ruleName: 'Inbox' }),
    ]);
    expect(days).toHaveLength(2);
    const first = days[0].items[0];
    expect(first.kind === 'row' && first.row).toMatchObject({
      name: 'new',
      from: 'Inbox',
      to: 'Archive',
      rule: 'Inbox',
      time: '09:05',
    });
  });

  it('bundles entries of one operation and keeps the group whole on a match', () => {
    const members = ['a', 'b'].map((id, i) =>
      entry(id, at(22, 10 + i), {
        bulkOperationId: 'op',
        ruleName: id === 'a' ? 'Books' : 'Daily',
      })
    );
    const [group] = view(members, { rule: 'Books' })[0].items;
    expect(group).toMatchObject({ kind: 'group', operation: 'periodic' });
    expect(group.kind === 'group' && group.rows).toHaveLength(2);
  });

  it('shows a lone bulk entry as a single row and marks undone', () => {
    const [item] = view([
      entry('a', at(22, 10), { bulkOperationId: 'op', undone: true }),
    ])[0].items;
    expect(item.kind === 'row' && item.row.undone).toBe(true);
  });

  it('filters by query, rule and range', () => {
    const list = [
      entry('Weekly review', at(22, 9), { ruleName: 'Work' }),
      entry('Ideas', at(1, 9)),
    ];
    expect(view(list, { query: 'weekly' })).toHaveLength(1);
    expect(view(list, { rule: 'Work' })[0].items).toHaveLength(1);
    expect(view(list, { range: 'week' })).toHaveLength(1);
    expect(view(list, { query: 'nothing' })).toEqual([]);
  });
});

describe('historySince / historyRuleNames', () => {
  it('computes cutoffs', () => {
    expect(historySince('all', now)).toBeNull();
    expect(historySince('today', now)).toBe(new Date(2026, 10, 22).getTime());
  });

  it('merges configured and used rule names', () => {
    expect(
      historyRuleNames([entry('a', now, { ruleName: 'Z' })], ['B', 'Z'])
    ).toEqual(['B', 'Z']);
  });
});
