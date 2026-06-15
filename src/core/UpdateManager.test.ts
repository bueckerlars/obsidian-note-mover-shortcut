import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../modals/UpdateModal', () => ({
  UpdateModal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
  })),
}));

vi.mock('../generated/changelog', () => ({
  CHANGELOG_ENTRIES: [],
}));

import type AdvancedNoteMoverPlugin from 'main';
import { UpdateManager } from './UpdateManager';
import {
  APP_LAST_SEEN_VERSION_KEY,
  clearSessionLastSeenVersionForTests,
  readAppLastSeenVersion,
} from '../infrastructure/persistence/app-level-release-notes-store';
import { shouldOfferReleaseNotes } from '../utils/version-compare';

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

function createMockPlugin(options: {
  version?: string;
  lastSeenVersion?: string;
  showReleaseNotesOnUpdate?: boolean;
}): AdvancedNoteMoverPlugin {
  const pluginData = {
    lastSeenVersion: options.lastSeenVersion,
    settings: {
      showReleaseNotesOnUpdate: options.showReleaseNotesOnUpdate ?? true,
    },
  };

  return {
    manifest: { version: options.version ?? '1.1.1' },
    pluginData,
    save_settings: vi.fn(async () => {
      /* noop */
    }),
    app: {},
  } as unknown as AdvancedNoteMoverPlugin;
}

describe('UpdateManager', () => {
  beforeEach(() => {
    clearSessionLastSeenVersionForTests();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  it('does not offer release notes when app-level storage already has current version (vault B after vault A)', async () => {
    localStorage.setItem(APP_LAST_SEEN_VERSION_KEY, '1.1.1');

    const plugin = createMockPlugin({
      version: '1.1.1',
      lastSeenVersion: '1.0.4',
    });
    const manager = new UpdateManager(plugin);

    await manager.checkForUpdates();

    expect(shouldOfferReleaseNotes('1.1.1', '1.1.1')).toBe(false);
    expect(plugin.save_settings).not.toHaveBeenCalled();
  });

  it('marks version seen at app level before vault save when release notes are disabled', async () => {
    const plugin = createMockPlugin({
      version: '1.1.1',
      lastSeenVersion: '1.0.4',
      showReleaseNotesOnUpdate: false,
    });
    const manager = new UpdateManager(plugin);

    await manager.checkForUpdates();

    expect(readAppLastSeenVersion()).toBe('1.1.1');
    expect(plugin.pluginData.lastSeenVersion).toBe('1.1.1');
    expect(plugin.save_settings).toHaveBeenCalledTimes(1);
  });

  it('seeds lastSeenVersion quietly when no prior version exists anywhere', async () => {
    const plugin = createMockPlugin({
      version: '1.1.1',
      lastSeenVersion: undefined,
    });
    const manager = new UpdateManager(plugin);

    await manager.checkForUpdates();

    expect(readAppLastSeenVersion()).toBe('1.1.1');
    expect(plugin.pluginData.lastSeenVersion).toBe('1.1.1');
    expect(plugin.save_settings).toHaveBeenCalledTimes(1);
  });
});
