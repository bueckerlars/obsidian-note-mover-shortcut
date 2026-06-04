/** Converts unknown values to strings without relying on default Object stringification. */
export function stringifyUnknown(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => stringifyUnknown(item)).join(', ');
  }
  return JSON.stringify(value);
}
