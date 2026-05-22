/**
 * Normalizes frontmatter list values to string[] (pure domain helper).
 */
export function parseListProperty(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(item => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  return [String(value).trim()].filter(item => item.length > 0);
}
