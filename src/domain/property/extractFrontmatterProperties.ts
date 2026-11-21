import { stringifyUnknown } from '../../utils/stringify-unknown';
import { isListProperty } from './isListProperty';
import { parseListProperty } from './parseListProperty';

function isNestedRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSkippedKey(key: string): boolean {
  return key === 'tags' || key.startsWith('position');
}

/**
 * Reads user frontmatter. Nested objects become dotted keys.
 * `tags` and `position*` are skipped. Empty strings stay so the key is kept.
 */
export function extractFrontmatterProperties(
  frontmatter: object | null | undefined
): Map<string, unknown[]> {
  const samples = new Map<string, unknown[]>();
  if (!frontmatter) {
    return samples;
  }
  collect(frontmatter as Record<string, unknown>, '', samples);
  return samples;
}

function collect(
  source: Record<string, unknown>,
  prefix: string,
  samples: Map<string, unknown[]>
): void {
  for (const [key, value] of Object.entries(source)) {
    if (!prefix && isSkippedKey(key)) {
      continue;
    }
    const path = prefix ? `${prefix}.${key}` : key;
    if (isNestedRecord(value)) {
      collect(value, path, samples);
      continue;
    }
    const existing = samples.get(path);
    if (existing) {
      existing.push(value);
    } else {
      samples.set(path, [value]);
    }
  }
}

/** Merges one frontmatter object per note into a single sample map. */
export function collectPropertySamples(
  frontmatters: Iterable<object | null | undefined>
): Map<string, unknown[]> {
  const merged = new Map<string, unknown[]>();
  for (const frontmatter of frontmatters) {
    for (const [key, values] of extractFrontmatterProperties(frontmatter)) {
      const existing = merged.get(key);
      if (existing) {
        existing.push(...values);
      } else {
        merged.set(key, [...values]);
      }
    }
  }
  return merged;
}

/** Suggestion strings for one frontmatter value. Null and undefined add nothing. */
export function propertyValueStrings(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (isListProperty(value)) {
    return parseListProperty(value);
  }
  return [stringifyUnknown(value)];
}
