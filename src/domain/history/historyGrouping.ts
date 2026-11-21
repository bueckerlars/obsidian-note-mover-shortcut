export const HISTORY_ACTIONS = ['open', 'undo', 'blacklist'] as const;

export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface HistoryGroupSource {
  id: string;
  timestamp: number;
  fileName: string;
  sourcePath: string;
  destinationPath: string;
  ruleName?: string;
}

export interface HistoryRow {
  id: string;
  timestamp: number;
  fileName: string;
  sourcePath: string;
  destinationPath: string;
  time: string;
  ruleName: string;
  actions: typeof HISTORY_ACTIONS;
}

export interface HistoryDayGroup {
  day: string;
  rows: HistoryRow[];
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatHistoryTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatHistoryDay(timestamp: number): string {
  const date = new Date(timestamp);
  const month = MONTHS[date.getMonth()] ?? '';
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function groupHistoryByDay(
  entries: readonly HistoryGroupSource[],
  unknownRule: string
): HistoryDayGroup[] {
  const sorted = [...entries].sort((left, right) => {
    return right.timestamp - left.timestamp;
  });
  const groups: HistoryDayGroup[] = [];
  const byDay = new Map<string, HistoryDayGroup>();

  for (const entry of sorted) {
    const key = dayKey(entry.timestamp);
    let group = byDay.get(key);
    if (!group) {
      group = { day: formatHistoryDay(entry.timestamp), rows: [] };
      byDay.set(key, group);
      groups.push(group);
    }
    const ruleName = entry.ruleName?.trim() || unknownRule;
    group.rows.push({
      id: entry.id,
      timestamp: entry.timestamp,
      fileName: entry.fileName,
      sourcePath: entry.sourcePath,
      destinationPath: entry.destinationPath,
      time: formatHistoryTime(entry.timestamp),
      ruleName,
      actions: HISTORY_ACTIONS,
    });
  }

  return groups;
}
