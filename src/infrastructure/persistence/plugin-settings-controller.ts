import type { Plugin } from 'obsidian';
import type {
  PluginData,
  SettingsData,
  HistoryData,
  Filter,
} from 'src/types/PluginData';
import { SETTINGS_CONSTANTS } from 'src/config/constants';
import { SettingsValidator } from 'src/utils/SettingsValidator';
import {
  RuleMigrationService,
  type LegacyRuleV1,
} from 'src/core/RuleMigrationService';
import { looksLikePluginDataRoot } from './plugin-settings-schema';

/** Plugin instance with persisted data fields used by this module. */
export type PluginWithPersistedSettings = Plugin & {
  settings: PluginData;
};

export async function loadPersistedSettings(
  plugin: PluginWithPersistedSettings
): Promise<void> {
  const savedData: unknown = await plugin.loadData();

  if (looksLikePluginDataRoot(savedData)) {
    plugin.settings = savedData as PluginData;
  } else {
    await backupLegacyDataJson(plugin);
    plugin.settings = migrateFromLegacy(savedData || {});
    await savePersistedSettings(plugin);
  }

  await validateAndRepairPluginData(plugin);
}

export type LegacySettingsFields = {
  rules?: LegacyRuleV1[];
  enableLegacyRules?: boolean;
  legacyMigrationDismissed?: boolean;
  enableRuleV2?: boolean;
};

export async function savePersistedSettings(
  plugin: PluginWithPersistedSettings
): Promise<void> {
  if (
    !plugin.settings.history ||
    typeof plugin.settings.history !== 'object' ||
    Array.isArray(plugin.settings.history)
  ) {
    plugin.settings.history = { history: [], bulkOperations: [] };
  }
  if (!Array.isArray(plugin.settings.history.history)) {
    plugin.settings.history.history = [];
  }
  if (!Array.isArray(plugin.settings.history.bulkOperations)) {
    plugin.settings.history.bulkOperations = [];
  }

  const settings = plugin.settings.settings as SettingsData &
    LegacySettingsFields;
  delete settings.rules;
  delete settings.enableLegacyRules;
  delete settings.legacyMigrationDismissed;
  delete settings.enableRuleV2;

  await plugin.saveData(plugin.settings);
}

export async function validateAndRepairPluginData(
  plugin: PluginWithPersistedSettings
): Promise<void> {
  if (!plugin.settings.settings) {
    plugin.settings.settings = buildDefaultSettingsData();
  }
  if (!plugin.settings.history) {
    plugin.settings.history = {
      history: [],
      bulkOperations: [],
    };
  }

  const settingsWithLegacy = plugin.settings.settings as SettingsData &
    LegacySettingsFields;
  if (!Array.isArray(settingsWithLegacy.rules)) {
    settingsWithLegacy.rules = [];
  }
  if (!plugin.settings.settings.filters) {
    plugin.settings.settings.filters = { filter: [] };
  }
  if (!Array.isArray(plugin.settings.settings.filters.filter)) {
    plugin.settings.settings.filters.filter = [];
  }

  if (settingsWithLegacy.enableRuleV2 !== undefined) {
    delete settingsWithLegacy.enableRuleV2;
    await savePersistedSettings(plugin);
  }
  delete settingsWithLegacy.enableLegacyRules;
  delete settingsWithLegacy.legacyMigrationDismissed;

  if (plugin.settings.settings.enableRuleEvaluationCache === undefined) {
    plugin.settings.settings.enableRuleEvaluationCache = true;
  }

  if (plugin.settings.settings.enableVaultIndexCache === undefined) {
    plugin.settings.settings.enableVaultIndexCache = true;
  }

  if (plugin.settings.settings.enablePerformanceDebug === undefined) {
    plugin.settings.settings.enablePerformanceDebug = false;
  }

  if (plugin.settings.settings.showReleaseNotesOnUpdate === undefined) {
    plugin.settings.settings.showReleaseNotesOnUpdate = true;
  }

  if (!plugin.settings.lastSeenVersion) {
    const nestedLastSeen = (
      plugin.settings.settings as { lastSeenVersion?: string }
    ).lastSeenVersion;
    if (typeof nestedLastSeen === 'string' && nestedLastSeen.trim() !== '') {
      plugin.settings.lastSeenVersion = nestedLastSeen.trim();
      delete (plugin.settings.settings as { lastSeenVersion?: string })
        .lastSeenVersion;
      await savePersistedSettings(plugin);
    }
  }

  if (!plugin.settings.settings.attachments) {
    plugin.settings.settings.attachments = {
      moveWithNote: false,
      skipSharedAttachments: true,
      deleteEmptyAssetFolders: false,
    };
  } else {
    if (plugin.settings.settings.attachments.moveWithNote === undefined) {
      plugin.settings.settings.attachments.moveWithNote = false;
    }
    if (
      plugin.settings.settings.attachments.skipSharedAttachments === undefined
    ) {
      plugin.settings.settings.attachments.skipSharedAttachments = true;
    }
    if (
      plugin.settings.settings.attachments.deleteEmptyAssetFolders === undefined
    ) {
      plugin.settings.settings.attachments.deleteEmptyAssetFolders = false;
    }
  }

  if (!Array.isArray(plugin.settings.settings.rulesV2)) {
    plugin.settings.settings.rulesV2 = [];
  }

  if (plugin.settings.schemaVersion === undefined) {
    plugin.settings.schemaVersion = 1;
  }

  const legacyRules = Array.isArray(settingsWithLegacy.rules)
    ? settingsWithLegacy.rules
    : [];
  settingsWithLegacy.rules = legacyRules.filter(
    rule =>
      Boolean(rule?.criteria) &&
      Boolean(rule?.path) &&
      String(rule.criteria).trim() !== '' &&
      String(rule.path).trim() !== ''
  );

  plugin.settings.settings.filters.filter =
    plugin.settings.settings.filters.filter.filter(
      f => f && typeof f.value === 'string' && f.value.trim() !== ''
    );

  if (
    RuleMigrationService.shouldMigrate(
      settingsWithLegacy.rules ?? [],
      plugin.settings.settings.rulesV2 ?? []
    )
  ) {
    console.debug('Migrating Rule V1 to Rule V2...');
    plugin.settings.settings.rulesV2 = RuleMigrationService.migrateRules(
      settingsWithLegacy.rules ?? []
    );
    console.debug(
      `Migrated ${(plugin.settings.settings.rulesV2 ?? []).length} rules to V2 format`
    );
    settingsWithLegacy.rules = [];
    await savePersistedSettings(plugin);
  } else {
    settingsWithLegacy.rules = [];
  }

  if (
    plugin.settings.settings.rulesV2 &&
    plugin.settings.settings.rulesV2.length > 0
  ) {
    const migrated = RuleMigrationService.migrateRuleV2Triggers(
      plugin.settings.settings.rulesV2
    );
    if (migrated) {
      console.debug(
        'Migrated RuleV2 triggers from ruleType to operator format'
      );
      await savePersistedSettings(plugin);
    }

    const repaired = RuleMigrationService.repairRuleV2Properties(
      plugin.settings.settings.rulesV2
    );
    if (repaired) {
      console.debug(
        'Repaired RuleV2 properties triggers with missing propertyName'
      );
      await savePersistedSettings(plugin);
    }
  }

  if (
    plugin.settings.settings.rulesV2 &&
    plugin.settings.settings.rulesV2.length > 0
  ) {
    const validationResult = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    SettingsValidator.validateRulesV2Array(
      plugin.settings.settings.rulesV2,
      validationResult
    );

    if (validationResult.errors.length > 0) {
      console.error('RuleV2 validation errors:', validationResult.errors);
    }
    if (validationResult.warnings.length > 0) {
      console.warn('RuleV2 validation warnings:', validationResult.warnings);
    }
  }
}

export function buildDefaultSettingsData(): SettingsData {
  const defaults = SETTINGS_CONSTANTS.DEFAULT_SETTINGS;
  return {
    triggers: {
      enablePeriodicMovement: !!defaults.enablePeriodicMovement,
      periodicMovementInterval: defaults.periodicMovementInterval ?? 5,
      enableOnEditTrigger: !!defaults.enableOnEditTrigger,
    },
    filters: {
      filter: Array.isArray(defaults.filter)
        ? defaults.filter.map(v => ({ value: v }))
        : [],
    },
    retentionPolicy: defaults.retentionPolicy,
    rulesV2: [],
    enableRuleEvaluationCache: true,
    enableVaultIndexCache: true,
    enablePerformanceDebug: false,
    showReleaseNotesOnUpdate: true,
    attachments: {
      moveWithNote: true,
      skipSharedAttachments: true,
      deleteEmptyAssetFolders: false,
    },
  };
}

function isLegacySettingsRecord(
  legacy: unknown
): legacy is Record<string, unknown> {
  return legacy !== null && typeof legacy === 'object';
}

function migrateFromLegacy(legacy: unknown): PluginData {
  const defaults = SETTINGS_CONSTANTS.DEFAULT_SETTINGS;
  const legacyRecord = isLegacySettingsRecord(legacy) ? legacy : {};

  const enablePeriodicMovement =
    legacyRecord.enablePeriodicMovement ??
    defaults.enablePeriodicMovement ??
    false;
  const periodicMovementInterval =
    legacyRecord.periodicMovementInterval ??
    defaults.periodicMovementInterval ??
    5;
  const enableOnEditTrigger =
    legacyRecord.enableOnEditTrigger ?? defaults.enableOnEditTrigger ?? false;
  const retentionPolicy =
    (legacyRecord.retentionPolicy as
      | SettingsData['retentionPolicy']
      | undefined) ?? defaults.retentionPolicy;

  const rules: LegacyRuleV1[] = Array.isArray(legacyRecord.rules)
    ? (legacyRecord.rules as LegacyRuleV1[])
    : [];
  const filterValues: string[] = Array.isArray(legacyRecord.filter)
    ? (legacyRecord.filter as string[])
    : [];
  const filters: Filter[] = filterValues
    .filter(v => typeof v === 'string')
    .map(v => ({ value: v }));

  const historyArray = Array.isArray(legacyRecord.history)
    ? (legacyRecord.history as HistoryData['history'])
    : [];
  const bulkOps = Array.isArray(legacyRecord.bulkOperations)
    ? (legacyRecord.bulkOperations as HistoryData['bulkOperations'])
    : [];

  const settings: SettingsData & LegacySettingsFields = {
    triggers: {
      enablePeriodicMovement: Boolean(enablePeriodicMovement),
      periodicMovementInterval: Number(periodicMovementInterval),
      enableOnEditTrigger: Boolean(enableOnEditTrigger),
    },
    filters: { filter: filters },
    rules,
    rulesV2: [],
    retentionPolicy,
    enableRuleEvaluationCache: true,
    enableVaultIndexCache: true,
    enablePerformanceDebug: false,
  };

  const data: PluginData = {
    settings,
    history: {
      history: historyArray,
      bulkOperations: bulkOps,
    },
    lastSeenVersion:
      typeof legacyRecord.lastSeenVersion === 'string'
        ? legacyRecord.lastSeenVersion
        : undefined,
    schemaVersion: 1,
  };

  return data;
}

async function backupLegacyDataJson(
  plugin: PluginWithPersistedSettings
): Promise<void> {
  try {
    const configDir = plugin.app.vault.configDir;
    const adapter = plugin.app.vault.adapter;
    const dataPath = `${configDir}/plugins/${plugin.manifest.id}/data.json`;
    if (!(await adapter.exists(dataPath))) return;
    const iso = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configDir}/plugins/${plugin.manifest.id}/data.backup.${iso}.json`;
    const content = await adapter.read(dataPath);
    await adapter.write(backupPath, content);
  } catch {
    // Best-effort backup; ignore errors
  }
}
