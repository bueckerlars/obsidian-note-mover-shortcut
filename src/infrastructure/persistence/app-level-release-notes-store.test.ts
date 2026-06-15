import { beforeEach, describe, expect, it } from 'vitest';
import {
  APP_LAST_SEEN_VERSION_KEY,
  clearSessionLastSeenVersionForTests,
  migrateVaultLastSeenToApp,
  persistLastSeenVersionAppLevel,
  readAppLastSeenVersion,
  resolveLastSeenVersion,
  writeAppLastSeenVersion,
} from './app-level-release-notes-store';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('app-level-release-notes-store', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    clearSessionLastSeenVersionForTests();
  });

  describe('readAppLastSeenVersion / writeAppLastSeenVersion', () => {
    it('reads and writes app-level version', () => {
      writeAppLastSeenVersion('1.1.1', storage);
      expect(readAppLastSeenVersion(storage)).toBe('1.1.1');
      expect(storage.getItem(APP_LAST_SEEN_VERSION_KEY)).toBe('1.1.1');
    });

    it('returns undefined for empty stored value', () => {
      storage.setItem(APP_LAST_SEEN_VERSION_KEY, '   ');
      expect(readAppLastSeenVersion(storage)).toBeUndefined();
    });
  });

  describe('resolveLastSeenVersion', () => {
    it('returns the newest version across session, app, and vault', () => {
      writeAppLastSeenVersion('1.1.0', storage);
      persistLastSeenVersionAppLevel('1.1.1', storage);
      expect(resolveLastSeenVersion('1.0.4', storage)).toBe('1.1.1');
    });

    it('prefers app-level over older vault value (multi-vault scenario)', () => {
      writeAppLastSeenVersion('1.1.1', storage);
      expect(resolveLastSeenVersion('1.0.4', storage)).toBe('1.1.1');
    });

    it('returns undefined when all sources are empty', () => {
      expect(resolveLastSeenVersion(undefined, storage)).toBeUndefined();
    });
  });

  describe('migrateVaultLastSeenToApp', () => {
    it('copies vault value when app storage is empty', () => {
      migrateVaultLastSeenToApp('1.0.5', storage);
      expect(readAppLastSeenVersion(storage)).toBe('1.0.5');
    });

    it('does not downgrade app storage when vault is older', () => {
      writeAppLastSeenVersion('1.1.1', storage);
      migrateVaultLastSeenToApp('1.0.4', storage);
      expect(readAppLastSeenVersion(storage)).toBe('1.1.1');
    });

    it('upgrades app storage when vault is newer', () => {
      writeAppLastSeenVersion('1.0.4', storage);
      migrateVaultLastSeenToApp('1.1.0', storage);
      expect(readAppLastSeenVersion(storage)).toBe('1.1.0');
    });
  });

  describe('persistLastSeenVersionAppLevel', () => {
    it('updates session and app storage synchronously', () => {
      persistLastSeenVersionAppLevel('1.1.1', storage);
      expect(readAppLastSeenVersion(storage)).toBe('1.1.1');
      expect(resolveLastSeenVersion(undefined, storage)).toBe('1.1.1');
    });
  });
});
