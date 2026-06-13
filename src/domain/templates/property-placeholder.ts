import {
  type DatePlaceholderComponent,
  formatDateComponent,
  isDatePlaceholderComponent,
  parsePropertyDateValue,
} from '../dates/property-date';
import { stringifyUnknown } from '../../utils/stringify-unknown';

export interface ParsedPropertyPlaceholderKey {
  lookupKey: string;
  dateComponent?: DatePlaceholderComponent;
}

export function parsePropertyPlaceholderKey(
  key: string
): ParsedPropertyPlaceholderKey {
  const trimmed = key.trim();
  if (!trimmed) {
    return { lookupKey: '' };
  }

  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return { lookupKey: trimmed };
  }

  const suffix = trimmed.substring(lastDot + 1);
  if (!isDatePlaceholderComponent(suffix)) {
    return { lookupKey: trimmed };
  }

  return {
    lookupKey: trimmed.substring(0, lastDot),
    dateComponent: suffix,
  };
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
  if (!parsed.dateComponent) {
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

  return formatDateComponent(parsedDate, parsed.dateComponent);
}
