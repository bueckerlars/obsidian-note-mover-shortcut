import { describe, expect, it } from 'vitest';
import {
  replaceSettings,
  restoreSettingsBackup,
  summarizeSettingsImport,
} from './importBackup';

describe('settings import backup', () => {
  it('counts the rules and filters that would be replaced', () => {
    expect(
      summarizeSettingsImport({
        settings: {
          rulesV2: [{ name: 'Inbox' }, { name: 'Daily' }],
          filters: { filter: [{ value: 'tag:#stay' }] },
        },
      })
    ).toEqual({ rules: 2, filters: 1 });

    expect(
      summarizeSettingsImport({
        rules: [{ name: 'Old' }],
        filter: ['tag:#a', 'path:Archive'],
      })
    ).toEqual({ rules: 1, filters: 2 });
  });

  it('writes the backup before overwrite and restores the previous settings', async () => {
    const files = new Map<string, string>();
    const current = JSON.stringify({
      settings: {
        rulesV2: [{ name: 'Old' }],
        filters: { filter: [{ value: 'tag:#stay' }] },
      },
    });
    files.set('data.json', current);
    const next = JSON.stringify({
      settings: {
        rulesV2: [{ name: 'New' }, { name: 'Other' }],
        filters: { filter: [{ value: 'tag:#next' }] },
      },
    });

    const replaced = await replaceSettings({
      current,
      summary: summarizeSettingsImport(JSON.parse(next) as unknown),
      confirm: async summary => {
        expect(summary).toEqual({ rules: 2, filters: 1 });
        return true;
      },
      writeBackup: async value => {
        expect(files.get('data.json')).toBe(current);
        files.set('data.backup.json', value);
      },
      backupExists: async () => files.has('data.backup.json'),
      apply: () => {
        expect(files.get('data.backup.json')).toBe(current);
      },
      save: async () => {
        if (!files.has('data.backup.json')) {
          throw new Error('backup missing at overwrite');
        }
        files.set('data.json', next);
      },
    });

    expect(replaced).toBe(true);
    expect(files.get('data.json')).toBe(next);
    expect(files.get('data.backup.json')).toBe(current);

    const restored = await restoreSettingsBackup({
      readBackup: async () => files.get('data.backup.json') ?? null,
      writeCurrent: async contents => {
        files.set('data.json', contents);
      },
    });

    expect(restored).toBe(current);
    expect(files.get('data.json')).toBe(current);
    expect(JSON.parse(files.get('data.json') ?? '').settings.rulesV2).toEqual([
      { name: 'Old' },
    ]);
  });

  it('does not write a backup when confirmation is declined', async () => {
    const files = new Map<string, string>();
    const save = async () => {
      throw new Error('save should not run');
    };

    const replaced = await replaceSettings({
      current: '{"settings":{}}',
      summary: { rules: 1, filters: 0 },
      confirm: async () => false,
      writeBackup: async () => {
        files.set('data.backup.json', 'too soon');
      },
      backupExists: async () => files.has('data.backup.json'),
      apply: () => {
        throw new Error('apply should not run');
      },
      save,
    });

    expect(replaced).toBe(false);
    expect(files.has('data.backup.json')).toBe(false);
  });
});
