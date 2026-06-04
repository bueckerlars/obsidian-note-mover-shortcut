/**
 * Compares two semver-like version strings (major.minor.patch).
 * @returns true if current is strictly newer than last
 */
export function isNewerVersion(current: string, last: string): boolean {
  const parseVersion = (version: string): number[] => {
    return version.split('.').map(v => parseInt(v, 10) || 0);
  };

  const currentParts = parseVersion(current);
  const lastParts = parseVersion(last);

  const maxLength = Math.max(currentParts.length, lastParts.length);
  while (currentParts.length < maxLength) currentParts.push(0);
  while (lastParts.length < maxLength) lastParts.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (currentParts[i] > lastParts[i]) return true;
    if (currentParts[i] < lastParts[i]) return false;
  }

  return false;
}

/**
 * Whether release notes should be offered after a plugin update.
 * Missing or empty lastSeenVersion is not treated as an update (first run / legacy data).
 */
export function shouldOfferReleaseNotes(
  lastSeenVersion: string | undefined,
  currentVersion: string
): boolean {
  const last = lastSeenVersion?.trim();
  if (!last) return false;
  return isNewerVersion(currentVersion, last);
}
