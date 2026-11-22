import { moment } from 'obsidian';

// Obsidian's typings expose moment as a namespace, but it is callable at runtime.
const toMoment = moment as unknown as (input: number | string) => {
  format: (pattern: string) => string;
  calendar: () => string;
};

/** "21 Nov 2026, 22:14" in the Obsidian locale. */
export function formatDateTime(timestamp: number | string): string {
  return toMoment(timestamp).format('D MMM YYYY, HH:mm');
}

/** "Today at 9:36 PM" or "11/21/2026", localized by moment. */
export function formatRelativeDateTime(timestamp: number): string {
  return toMoment(timestamp).calendar();
}
