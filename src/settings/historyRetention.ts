import type { RetentionPolicy } from '../types/HistoryEntry';
import { fill, strings } from '../i18n/locale';

export const FOREVER = 'forever';
/** Day counts offered in the dropdown. */
export const RETENTION_PRESET_DAYS = [7, 30, 90, 365] as const;

const DAYS_PER_UNIT = { days: 1, weeks: 7, months: 30 } as const;

/** Maps a stored policy to a dropdown key: a day count or "forever". */
export function retentionToKey(policy: RetentionPolicy): string {
  if (!(policy.value > 0)) {
    return FOREVER;
  }
  const unit = DAYS_PER_UNIT[policy.unit] ?? 1;
  return String(Math.round(policy.value * unit));
}

export function keyToRetention(key: string): RetentionPolicy {
  if (key === FOREVER) {
    return { value: 0, unit: 'days' };
  }
  return { value: Number(key), unit: 'days' };
}

/** True when the stored policy has no matching preset, so the dropdown needs an extra option. */
export function isCustomRetentionKey(key: string): boolean {
  return (
    key !== FOREVER &&
    !(RETENTION_PRESET_DAYS as readonly number[]).includes(Number(key))
  );
}

/** "30 days", "1 year". */
export function retentionDaysLabel(days: number): string {
  const labels = strings().settings;
  return days === 365
    ? fill(labels.historyKeepYear, { count: 1 })
    : fill(labels.historyKeepDays, { count: days });
}
