import type { TimeFilter } from '../../types/HistoryEntry';

export interface HistorySource {
  id: string;
  timestamp: number;
  fileName: string;
  sourcePath: string;
  destinationPath: string;
  ruleName?: string;
  bulkOperationId?: string;
  operationType?: 'single' | 'bulk' | 'periodic';
  undone?: boolean;
}

export interface HistoryOperation {
  id: string;
  operationType: 'bulk' | 'periodic';
}

export interface HistoryRow {
  id: string;
  timestamp: number;
  /** File name without the .md extension. */
  name: string;
  from: string;
  to: string;
  /** Null when no rule moved the note. */
  rule: string | null;
  time: string;
  undone: boolean;
}

export interface HistoryGroupItem {
  kind: 'group';
  id: string;
  operation: 'bulk' | 'periodic';
  timestamp: number;
  time: string;
  rows: HistoryRow[];
  allUndone: boolean;
}

export type HistoryItem = { kind: 'row'; row: HistoryRow } | HistoryGroupItem;

export interface HistoryDay {
  /** Start of the day, for the label. */
  timestamp: number;
  items: HistoryItem[];
}

export interface HistoryViewOptions {
  query: string;
  /** Rule name to show, or null for all rules. */
  rule: string | null;
  range: TimeFilter;
  now: number;
  rootLabel: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatHistoryTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Oldest timestamp a range still shows. Null shows everything. */
export function historySince(range: TimeFilter, now: number): number | null {
  switch (range) {
    case 'today':
      return startOfDay(now);
    case 'week':
      return now - 7 * DAY_MS;
    case 'month':
      return now - 30 * DAY_MS;
    default:
      return null;
  }
}

function parentFolder(path: string, rootLabel: string): string {
  const index = path.lastIndexOf('/');
  return index > 0 ? path.slice(0, index) : rootLabel;
}

function toRow(entry: HistorySource, rootLabel: string): HistoryRow {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    name: entry.fileName.replace(/\.md$/i, ''),
    from: parentFolder(entry.sourcePath, rootLabel),
    to: parentFolder(entry.destinationPath, rootLabel),
    rule: entry.ruleName?.trim() || null,
    time: formatHistoryTime(entry.timestamp),
    undone: entry.undone === true,
  };
}

function matches(row: HistoryRow, options: HistoryViewOptions): boolean {
  if (options.rule !== null && row.rule !== options.rule) {
    return false;
  }
  const query = options.query.trim().toLowerCase();
  if (!query) {
    return true;
  }
  return [row.name, row.from, row.to, row.rule ?? ''].some(text =>
    text.toLowerCase().includes(query)
  );
}

/**
 * Turns history entries into day sections of single moves and move-together
 * groups. A group stays whole when any of its notes matches the filters.
 */
export function buildHistoryView(
  entries: readonly HistorySource[],
  operations: readonly HistoryOperation[],
  options: HistoryViewOptions
): HistoryDay[] {
  const since = historySince(options.range, options.now);
  const kinds = new Map(operations.map(op => [op.id, op.operationType]));
  const grouped = new Map<string, HistorySource[]>();
  const items: HistoryItem[] = [];

  for (const entry of entries) {
    if (since !== null && entry.timestamp < since) continue;
    const bulkId = entry.bulkOperationId;
    if (bulkId) {
      grouped.set(bulkId, [...(grouped.get(bulkId) ?? []), entry]);
    } else {
      const row = toRow(entry, options.rootLabel);
      if (matches(row, options)) items.push({ kind: 'row', row });
    }
  }

  for (const [id, members] of grouped) {
    const rows = members
      .map(entry => toRow(entry, options.rootLabel))
      .sort((left, right) => right.timestamp - left.timestamp);
    if (!rows.some(row => matches(row, options))) continue;
    if (rows.length < 2) {
      items.push({ kind: 'row', row: rows[0] });
      continue;
    }
    const timestamp = Math.max(...rows.map(row => row.timestamp));
    const type = kinds.get(id) ?? members[0].operationType;
    items.push({
      kind: 'group',
      id,
      operation: type === 'periodic' ? 'periodic' : 'bulk',
      timestamp,
      time: formatHistoryTime(timestamp),
      rows,
      allUndone: rows.every(row => row.undone),
    });
  }

  const stamp = (item: HistoryItem): number =>
    item.kind === 'row' ? item.row.timestamp : item.timestamp;
  items.sort((left, right) => stamp(right) - stamp(left));

  const days: HistoryDay[] = [];
  for (const item of items) {
    const day = startOfDay(stamp(item));
    const last = days[days.length - 1];
    if (last?.timestamp === day) {
      last.items.push(item);
    } else {
      days.push({ timestamp: day, items: [item] });
    }
  }
  return days;
}

/** Rule names to offer in the filter, sorted. */
export function historyRuleNames(
  entries: readonly HistorySource[],
  configured: readonly string[]
): string[] {
  const names = new Set(configured.map(name => name.trim()).filter(Boolean));
  for (const entry of entries) {
    if (entry.ruleName?.trim()) names.add(entry.ruleName.trim());
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}
