import { stringifyUnknown } from '../../utils/stringify-unknown';

export const DATE_PLACEHOLDER_COMPONENTS = [
  'year',
  'month',
  'day',
  'iso',
  'monthName',
  'dayOfWeek',
] as const;

export type DatePlaceholderComponent =
  (typeof DATE_PLACEHOLDER_COMPONENTS)[number];

const DATE_COMPONENT_SET = new Set<string>(DATE_PLACEHOLDER_COMPONENTS);

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

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

const DAY_OF_WEEK_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
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
    case 'dayOfWeek': {
      const dayIndex = new Date(date.year, date.month - 1, date.day).getDay();
      return DAY_OF_WEEK_NAMES[dayIndex] ?? '';
    }
  }
}
