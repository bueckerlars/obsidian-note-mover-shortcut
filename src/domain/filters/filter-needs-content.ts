/**
 * Returns true if any blacklist filter may require full file body (vault.read).
 * Matches criteria type `content:` (case-insensitive, leading whitespace ignored).
 */
export function filtersNeedContent(filters: string[]): boolean {
  for (const raw of filters) {
    if (typeof raw !== 'string') continue;
    const s = raw.trimStart();
    if (/^content\s*:/i.test(s)) {
      return true;
    }
  }
  return false;
}
