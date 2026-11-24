import { moment } from 'obsidian';

// Obsidian's typings expose moment as a namespace, but it is callable at runtime.
interface Moment {
  format: (pattern: string) => string;
  calendar: () => string;
  isSame: (other: Moment, unit: 'day' | 'year') => boolean;
  clone: () => Moment;
  subtract: (amount: number, unit: 'day') => Moment;
}

const toMoment = moment as unknown as (input?: number | string) => Moment;

/** "21 Nov 2026, 22:14" in the Obsidian locale. */
export function formatDateTime(timestamp: number | string): string {
  return toMoment(timestamp).format('D MMM YYYY, HH:mm');
}

/** "Today at 9:36 PM" or "11/21/2026", localized by moment. */
export function formatRelativeDateTime(timestamp: number): string {
  return toMoment(timestamp).calendar();
}

/** "Today", "Yesterday", "17 November" (with the year when it is not this one). */
export function formatDayHeading(
  timestamp: number,
  labels: { today: string; yesterday: string }
): string {
  const day = toMoment(timestamp);
  const now = toMoment();
  if (day.isSame(now, 'day')) return labels.today;
  if (day.isSame(now.clone().subtract(1, 'day'), 'day')) {
    return labels.yesterday;
  }
  return day.format(day.isSame(now, 'year') ? 'D MMMM' : 'D MMMM YYYY');
}
