import { isNewerVersion } from '../../utils/version-compare';

/**
 * App-wide lastSeenVersion storage (not vault-scoped).
 * Obsidian App#saveLocalStorage is namespaced per vault; raw window.localStorage
 * persists across vault switches within the same Obsidian install.
 */

export const APP_LAST_SEEN_VERSION_KEY = 'note-mover-shortcut:lastSeenVersion';

/** In-memory cache for the current Obsidian session (survives vault switches). */
let sessionLastSeenVersion: string | undefined;

export function readAppLastSeenVersion(
  storage: Storage | null | undefined = getDefaultStorage()
): string | undefined {
  if (!storage) return undefined;
  try {
    const value = storage.getItem(APP_LAST_SEEN_VERSION_KEY);
    const trimmed = value?.trim();
    return trimmed || undefined;
  } catch {
    return undefined;
  }
}

export function writeAppLastSeenVersion(
  version: string,
  storage: Storage | null | undefined = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(APP_LAST_SEEN_VERSION_KEY, version);
  } catch {
    // Best-effort; vault-level persistence remains as fallback.
  }
}

export function setSessionLastSeenVersion(version: string): void {
  sessionLastSeenVersion = version.trim() || undefined;
}

export function clearSessionLastSeenVersionForTests(): void {
  sessionLastSeenVersion = undefined;
}

/**
 * Returns the newest known last-seen version across session, app, and vault storage.
 */
export function resolveLastSeenVersion(
  vaultVersion: string | undefined,
  storage: Storage | null | undefined = getDefaultStorage()
): string | undefined {
  const candidates = [
    sessionLastSeenVersion,
    readAppLastSeenVersion(storage),
    vaultVersion?.trim(),
  ].filter((v): v is string => Boolean(v?.trim()));

  if (candidates.length === 0) return undefined;

  return candidates.reduce((best, candidate) => {
    if (!best) return candidate;
    return isNewerVersion(candidate, best) ? candidate : best;
  });
}

/**
 * Copies a vault-scoped lastSeenVersion into app-level storage when app storage is empty.
 */
export function migrateVaultLastSeenToApp(
  vaultVersion: string | undefined,
  storage: Storage | null | undefined = getDefaultStorage()
): void {
  const vault = vaultVersion?.trim();
  if (!vault) return;

  const app = readAppLastSeenVersion(storage);
  if (!app) {
    writeAppLastSeenVersion(vault, storage);
    return;
  }

  if (isNewerVersion(vault, app)) {
    writeAppLastSeenVersion(vault, storage);
  }
}

/**
 * Persists lastSeenVersion at session and app level synchronously.
 */
export function persistLastSeenVersionAppLevel(
  version: string,
  storage: Storage | null | undefined = getDefaultStorage()
): void {
  const trimmed = version.trim();
  if (!trimmed) return;
  setSessionLastSeenVersion(trimmed);
  writeAppLastSeenVersion(trimmed, storage);
}

function getDefaultStorage(): Storage | null | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}
