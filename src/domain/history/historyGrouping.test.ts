import { describe, expect, it } from 'vitest';
import {
  formatHistoryTime,
  groupHistoryByDay,
  HISTORY_ACTIONS,
} from './historyGrouping';

const unknownRule = 'Unknown rule';

function entry(
  id: string,
  timestamp: number,
  ruleName?: string
): {
  id: string;
  timestamp: number;
  fileName: string;
  sourcePath: string;
  destinationPath: string;
  ruleName?: string;
} {
  return {
    id,
    timestamp,
    fileName: `${id}.md`,
    sourcePath: `Inbox/${id}.md`,
    destinationPath: `Archive/${id}.md`,
    ruleName,
  };
}

describe('groupHistoryByDay', () => {
  const morning = new Date(2026, 10, 21, 9, 5).getTime();
  const evening = new Date(2026, 10, 21, 18, 40).getTime();
  const previous = new Date(2026, 10, 20, 23, 10).getTime();

  it('groups entries from the same calendar day and sorts newest first', () => {
    const groups = groupHistoryByDay(
      [
        entry('morning', morning, 'Inbox'),
        entry('previous', previous, 'Archive'),
        entry('evening', evening, 'Inbox'),
      ],
      unknownRule
    );

    expect(groups.map(group => group.day)).toEqual([
      '21 Nov 2026',
      '20 Nov 2026',
    ]);
    expect(groups[0]?.rows.map(row => row.id)).toEqual(['evening', 'morning']);
    expect(groups[1]?.rows.map(row => row.id)).toEqual(['previous']);
  });

  it('formats the row time as hours and minutes', () => {
    expect(formatHistoryTime(morning)).toBe('09:05');
    const groups = groupHistoryByDay(
      [entry('morning', morning, 'Inbox')],
      unknownRule
    );
    expect(groups[0]?.rows[0]?.time).toBe('09:05');
  });

  it('uses the fallback when a row has no rule name', () => {
    const groups = groupHistoryByDay(
      [entry('bare', morning), entry('named', evening, '  Projects  ')],
      unknownRule
    );
    const rows = groups[0]?.rows ?? [];
    expect(rows.find(row => row.id === 'bare')?.ruleName).toBe(unknownRule);
    expect(rows.find(row => row.id === 'named')?.ruleName).toBe('Projects');
  });

  it('gives every row the same action set', () => {
    const groups = groupHistoryByDay(
      [entry('one', morning, 'Inbox'), entry('two', previous, 'Inbox')],
      unknownRule
    );
    const actions = groups.flatMap(group => group.rows.map(row => row.actions));
    expect(actions).toEqual([HISTORY_ACTIONS, HISTORY_ACTIONS]);
    expect(HISTORY_ACTIONS).toEqual(['open', 'undo', 'blacklist']);
  });
});
