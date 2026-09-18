import { stringifyUnknown } from '../../utils/stringify-unknown';

export const DATE_PLACEHOLDER_COMPONENTS = [
  'year',
  'month',
  'day',
  'iso',
  'monthName',
  'MMM',
  'dayOfWeek',
] as const;

export type DatePlaceholderComponent =
  (typeof DATE_PLACEHOLDER_COMPONENTS)[number];

/** Common Moment-style patterns suggested after {{property.<dateKey>. */
export const DATE_FORMAT_PATTERN_SUGGESTIONS = [
  'MMM',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'YYYY/MM/DD',
  'YYYY.MM.DD',
] as const;

const DATE_COMPONENT_SET = new Set<string>(DATE_PLACEHOLDER_COMPONENTS);

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

const DATE_FORMAT_TOKEN_PATTERN = /YYYY|MMMM|dddd|MMM|ddd|YY|MM|DD|M|D/g;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTH_SHORT_NAMES = [
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

const DAY_OF_WEEK_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const DAY_OF_WEEK_FULL_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const DAY_OF_WEEK_SHORT_NAMES = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

export interface ParsedPropertyDate {
  year: number;
  month: number;
  day: number;
}

export function isDatePlaceholderComponent(
  value: string
): value is DatePlaceholderComponent {
  return DATE_COMPONENT_SET.has(value);
}

const MULTI_CHAR_DATE_TOKEN_PATTERN = /YYYY|MMMM|dddd|MMM|ddd|YY|MM|DD/;

/**
 * True when `value` is a Moment-style date pattern made only of supported
 * tokens (YYYY, MMM, DD, …) and separators (- / . space).
 *
 * Single-character patterns (`D`, `M`) are rejected so suffixes like
 * `priority.D` stay literal keys. Those tokens are still valid inside a
 * larger pattern such as `D-M-YYYY`.
 */
export function isDateFormatPattern(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  DATE_FORMAT_TOKEN_PATTERN.lastIndex = 0;
  const stripped = trimmed.replace(DATE_FORMAT_TOKEN_PATTERN, '');
  if (stripped === trimmed || !/^[-/.\s]*$/.test(stripped)) {
    return false;
  }

  return /[-/.\s]/.test(trimmed) || MULTI_CHAR_DATE_TOKEN_PATTERN.test(trimmed);
}

export type DateFormatSeparator = '.' | ':';

/**
 * Destination-template suggestions after `{{property.<dateKey>.` or `:`.
 * Named components always use `.`. Patterns that contain `.` always use `:`.
 */
export function buildDatePlaceholderSuggestions(
  propertyName: string,
  search: string,
  formatSeparator: DateFormatSeparator = '.'
): string[] {
  const lowerSearch = search.toLowerCase();
  const values: string[] = [];
  const seen = new Set<string>();

  const push = (value: string): void => {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    values.push(value);
  };

  for (const component of DATE_PLACEHOLDER_COMPONENTS) {
    if (!lowerSearch || component.toLowerCase().startsWith(lowerSearch)) {
      push(`{{property.${propertyName}.${component}}}`);
    }
  }

  for (const pattern of DATE_FORMAT_PATTERN_SUGGESTIONS) {
    if (lowerSearch && !pattern.toLowerCase().startsWith(lowerSearch)) {
      continue;
    }
    const separator = pattern.includes('.') ? ':' : formatSeparator;
    push(`{{property.${propertyName}${separator}${pattern}}}`);
  }

  return values;
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function parseIsoDatePrefix(value: string): ParsedPropertyDate | null {
  const match = ISO_DATE_PREFIX.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return { year, month, day };
}

function parseFromDateObject(date: Date): ParsedPropertyDate | null {
  if (isNaN(date.getTime())) {
    return null;
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function parseFromString(value: string): ParsedPropertyDate | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoDate = parseIsoDatePrefix(trimmed);
  if (isoDate) {
    return isoDate;
  }

  const normalized = trimmed
    .replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, '$3-$2-$1')
    .replace(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, '$3-$2-$1');

  const normalizedIso = parseIsoDatePrefix(normalized);
  if (normalizedIso) {
    return normalizedIso;
  }

  return parseFromDateObject(new Date(trimmed));
}

export function parsePropertyDateValue(
  raw: unknown
): ParsedPropertyDate | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return parseFromDateObject(new Date(raw));
  }

  if (typeof raw === 'string') {
    return parseFromString(raw);
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return null;
    }
    return parsePropertyDateValue(raw[0]);
  }

  return parseFromString(stringifyUnknown(raw));
}

function dayOfWeekIndex(date: ParsedPropertyDate): number {
  return new Date(date.year, date.month - 1, date.day).getDay();
}

export function formatDateComponent(
  date: ParsedPropertyDate,
  component: DatePlaceholderComponent
): string {
  switch (component) {
    case 'year':
      return String(date.year);
    case 'month':
      return padTwo(date.month);
    case 'day':
      return padTwo(date.day);
    case 'iso':
      return `${date.year}-${padTwo(date.month)}-${padTwo(date.day)}`;
    case 'monthName':
      return MONTH_NAMES[date.month - 1] ?? '';
    case 'MMM':
      return MONTH_SHORT_NAMES[date.month - 1] ?? '';
    case 'dayOfWeek': {
      return DAY_OF_WEEK_NAMES[dayOfWeekIndex(date)] ?? '';
    }
  }
}

const DATE_FORMAT_TOKEN_VALUES: ReadonlyArray<
  [string, (date: ParsedPropertyDate) => string]
> = [
  ['YYYY', date => String(date.year)],
  ['MMMM', date => MONTH_NAMES[date.month - 1] ?? ''],
  ['dddd', date => DAY_OF_WEEK_FULL_NAMES[dayOfWeekIndex(date)] ?? ''],
  ['MMM', date => MONTH_SHORT_NAMES[date.month - 1] ?? ''],
  ['ddd', date => DAY_OF_WEEK_SHORT_NAMES[dayOfWeekIndex(date)] ?? ''],
  ['YY', date => padTwo(date.year % 100)],
  ['MM', date => padTwo(date.month)],
  ['DD', date => padTwo(date.day)],
  ['M', date => String(date.month)],
  ['D', date => String(date.day)],
];

/**
 * Format a calendar date with Moment-style tokens. Longer tokens are matched
 * first so `MMMM` is consumed before `MMM`.
 */
export function formatDatePattern(
  date: ParsedPropertyDate,
  pattern: string
): string {
  let result = '';
  let index = 0;

  while (index < pattern.length) {
    let matched = false;

    for (const [token, formatter] of DATE_FORMAT_TOKEN_VALUES) {
      if (pattern.startsWith(token, index)) {
        result += formatter(date);
        index += token.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result += pattern.charAt(index);
      index += 1;
    }
  }

  return result;
}
