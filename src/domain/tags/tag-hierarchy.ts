/**
 * Hierarchical tag matching (Obsidian nested tags use `/` as separator).
 * `#parent` matches `#parent` and `#parent/child` but not `#parent1`.
 */

export function normalizeTagForCompare(tag: string): string {
  const trimmed = tag.trim().toLowerCase();
  if (trimmed === '') {
    return '';
  }
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

/** True when fileTag equals ruleTag or is a nested child (ruleTag/…). */
export function tagEqualsOrIsChildOf(
  fileTag: string,
  ruleTag: string
): boolean {
  const normalizedFile = normalizeTagForCompare(fileTag);
  const normalizedRule = normalizeTagForCompare(ruleTag);
  if (normalizedRule === '') {
    return false;
  }
  if (normalizedFile === normalizedRule) {
    return true;
  }
  return normalizedFile.startsWith(`${normalizedRule}/`);
}

/** True when any tag on the note matches the rule tag hierarchically. */
export function noteHasTag(fileTags: string[], ruleTag: string): boolean {
  return fileTags.some(fileTag => tagEqualsOrIsChildOf(fileTag, ruleTag));
}
