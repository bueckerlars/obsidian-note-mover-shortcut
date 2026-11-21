export const SETTINGS_BACKUP_FILE = 'data.backup.json';

export interface SettingsImportSummary {
  rules: number;
  filters: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/** Counts the rules and filters an import file would write over the current ones. */
export function summarizeSettingsImport(
  imported: unknown
): SettingsImportSummary {
  const root = asRecord(imported);
  const settings = asRecord(root?.settings) ?? root;
  if (!settings) {
    return { rules: 0, filters: 0 };
  }

  const rulesV2 = Array.isArray(settings.rulesV2) ? settings.rulesV2.length : 0;
  const legacyRules = Array.isArray(settings.rules) ? settings.rules.length : 0;
  const filtersField = asRecord(settings.filters);
  const nestedFilters = Array.isArray(filtersField?.filter)
    ? filtersField.filter.length
    : 0;
  const legacyFilters = Array.isArray(settings.filter)
    ? settings.filter.length
    : 0;

  return {
    rules: rulesV2 > 0 ? rulesV2 : legacyRules,
    filters: nestedFilters > 0 ? nestedFilters : legacyFilters,
  };
}

/**
 * Writes the backup, then applies and saves. `save` must not run unless the
 * backup is already stored.
 */
export async function replaceSettings<T>(options: {
  current: T;
  summary: SettingsImportSummary;
  confirm: (summary: SettingsImportSummary) => Promise<boolean> | boolean;
  writeBackup: (current: T) => Promise<void>;
  backupExists: () => Promise<boolean>;
  apply: () => Promise<void> | void;
  save: () => Promise<void>;
}): Promise<boolean> {
  const accepted = await options.confirm(options.summary);
  if (!accepted) {
    return false;
  }
  await options.writeBackup(options.current);
  if (!(await options.backupExists())) {
    throw new Error('Settings backup was not written');
  }
  await options.apply();
  await options.save();
  return true;
}

/** Copies the backup back over the current settings. */
export async function restoreSettingsBackup(options: {
  readBackup: () => Promise<string | null>;
  writeCurrent: (contents: string) => Promise<void>;
}): Promise<string | null> {
  const backup = await options.readBackup();
  if (backup === null) {
    return null;
  }
  await options.writeCurrent(backup);
  return backup;
}
