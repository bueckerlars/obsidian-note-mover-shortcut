import {
  type DatePlaceholderComponent,
  formatDateComponent,
  formatDatePattern,
  isDateFormatPattern,
  isDatePlaceholderComponent,
  parsePropertyDateValue,
} from '../dates/property-date';
import { stringifyUnknown } from '../../utils/stringify-unknown';

export interface ParsedPropertyPlaceholderKey {
  lookupKey: string;
  dateComponent?: DatePlaceholderComponent;
  dateFormat?: string;
}

export function parsePropertyPlaceholderKey(
  key: string
): ParsedPropertyPlaceholderKey {
  const trimmed = key.trim();
  if (!trimmed) {
    return { lookupKey: '' };
  }

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > 0 && colonIndex < trimmed.length - 1) {
    const lookupKey = trimmed.substring(0, colonIndex);
    const dateFormat = trimmed.substring(colonIndex + 1).trim();
    if (isDateFormatPattern(dateFormat)) {
      return { lookupKey, dateFormat };
    }
  }

  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return { lookupKey: trimmed };
  }

  const suffix = trimmed.substring(lastDot + 1).trim();
  const lookupKey = trimmed.substring(0, lastDot);

  if (isDatePlaceholderComponent(suffix)) {
    return {
      lookupKey,
      dateComponent: suffix,
    };
  }

  if (isDateFormatPattern(suffix)) {
    return {
      lookupKey,
      dateFormat: suffix,
    };
  }

  return { lookupKey: trimmed };
}

function stringifyPropertyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return stringifyUnknown(value);
}

function resolveLiteralPropertyValue(
  key: string,
  properties: Record<string, unknown>
): string {
  if (!Object.prototype.hasOwnProperty.call(properties, key)) {
    return '';
  }

  return stringifyPropertyValue(properties[key]);
}

export function resolvePropertyPlaceholder(
  key: string,
  properties: Record<string, unknown>
): string {
  if (!properties || typeof properties !== 'object') {
    return '';
  }

  const trimmedKey = key.trim();
  if (!trimmedKey) {
    return '';
  }

  if (Object.prototype.hasOwnProperty.call(properties, trimmedKey)) {
    return resolveLiteralPropertyValue(trimmedKey, properties);
  }

  const parsed = parsePropertyPlaceholderKey(trimmedKey);
  if (!parsed.dateComponent && !parsed.dateFormat) {
    return '';
  }

  if (!Object.prototype.hasOwnProperty.call(properties, parsed.lookupKey)) {
    return '';
  }

  const rawValue = properties[parsed.lookupKey];
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  const parsedDate = parsePropertyDateValue(rawValue);
  if (!parsedDate) {
    return '';
  }

  if (parsed.dateComponent) {
    return formatDateComponent(parsedDate, parsed.dateComponent);
  }

  if (parsed.dateFormat) {
    return formatDatePattern(parsedDate, parsed.dateFormat);
  }

  return '';
}
