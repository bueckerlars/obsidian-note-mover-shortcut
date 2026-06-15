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
import {
  migrateVaultLastSeenToApp,
  resolveLastSeenVersion,
} from './app-level-release-notes-store';

/** Plugin instance with persisted data fields used by this module. */
export type PluginWithPersistedSettings = Plugin & {
  pluginData: PluginData;
};

export async function loadPersistedSettings(
  plugin: PluginWithPersistedSettings
): Promise<void> {
  const savedData: unknown = await plugin.loadData();

  if (looksLikePluginDataRoot(savedData)) {
    plugin.pluginData = savedData as PluginData;
  } else {
    await backupLegacyDataJson(plugin);
    plugin.pluginData = migrateFromLegacy(savedData || {});
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
    !plugin.pluginData.history ||
    typeof plugin.pluginData.history !== 'object' ||
    Array.isArray(plugin.pluginData.history)
  ) {
    plugin.pluginData.history = { history: [], bulkOperations: [] };
  }
  if (!Array.isArray(plugin.pluginData.history.history)) {
    plugin.pluginData.history.history = [];
  }
  if (!Array.isArray(plugin.pluginData.history.bulkOperations)) {
    plugin.pluginData.history.bulkOperations = [];
  }

  const settings = plugin.pluginData.settings as SettingsData &
    LegacySettingsFields;
  delete settings.rules;
  delete settings.enableLegacyRules;
  delete settings.legacyMigrationDismissed;
  delete settings.enableRuleV2;

  await plugin.saveData(plugin.pluginData);
}

export async function validateAndRepairPluginData(
  plugin: PluginWithPersistedSettings
): Promise<void> {
  if (!plugin.pluginData.settings) {
    plugin.pluginData.settings = buildDefaultSettingsData();
  }
  if (!plugin.pluginData.history) {
    plugin.pluginData.history = {
      history: [],
      bulkOperations: [],
    };
  }

  const settingsWithLegacy = plugin.pluginData.settings as SettingsData &
    LegacySettingsFields;
  if (!Array.isArray(settingsWithLegacy.rules)) {
    settingsWithLegacy.rules = [];
  }
  if (!plugin.pluginData.settings.filters) {
    plugin.pluginData.settings.filters = { filter: [] };
  }
  if (!Array.isArray(plugin.pluginData.settings.filters.filter)) {
    plugin.pluginData.settings.filters.filter = [];
  }

  if (settingsWithLegacy.enableRuleV2 !== undefined) {
    delete settingsWithLegacy.enableRuleV2;
    await savePersistedSettings(plugin);
  }
  delete settingsWithLegacy.enableLegacyRules;
  delete settingsWithLegacy.legacyMigrationDismissed;

  if (plugin.pluginData.settings.enableRuleEvaluationCache === undefined) {
    plugin.pluginData.settings.enableRuleEvaluationCache = true;
  }

  if (plugin.pluginData.settings.enableVaultIndexCache === undefined) {
    plugin.pluginData.settings.enableVaultIndexCache = true;
  }

  if (plugin.pluginData.settings.enablePerformanceDebug === undefined) {
    plugin.pluginData.settings.enablePerformanceDebug = false;
  }

  if (plugin.pluginData.settings.showReleaseNotesOnUpdate === undefined) {
    plugin.pluginData.settings.showReleaseNotesOnUpdate = true;
  }

  if (!plugin.pluginData.lastSeenVersion) {
    const nestedLastSeen = (
      plugin.pluginData.settings as { lastSeenVersion?: string }
    ).lastSeenVersion;
    if (typeof nestedLastSeen === 'string' && nestedLastSeen.trim() !== '') {
      plugin.pluginData.lastSeenVersion = nestedLastSeen.trim();
      delete (plugin.pluginData.settings as { lastSeenVersion?: string })
        .lastSeenVersion;
      await savePersistedSettings(plugin);
    }
  }

  migrateVaultLastSeenToApp(plugin.pluginData.lastSeenVersion);
  const resolvedLastSeen = resolveLastSeenVersion(
    plugin.pluginData.lastSeenVersion
  );
  if (
    resolvedLastSeen &&
    resolvedLastSeen !== plugin.pluginData.lastSeenVersion
  ) {
    plugin.pluginData.lastSeenVersion = resolvedLastSeen;
    await savePersistedSettings(plugin);
  }

  if (!plugin.pluginData.settings.attachments) {
    plugin.pluginData.settings.attachments = {
      moveWithNote: false,
      skipSharedAttachments: true,
      deleteEmptyAssetFolders: false,
    };
  } else {
    if (plugin.pluginData.settings.attachments.moveWithNote === undefined) {
      plugin.pluginData.settings.attachments.moveWithNote = false;
    }
    if (
      plugin.pluginData.settings.attachments.skipSharedAttachments === undefined
    ) {
      plugin.pluginData.settings.attachments.skipSharedAttachments = true;
    }
    if (
      plugin.pluginData.settings.attachments.deleteEmptyAssetFolders ===
      undefined
    ) {
      plugin.pluginData.settings.attachments.deleteEmptyAssetFolders = false;
    }
  }

  if (!Array.isArray(plugin.pluginData.settings.rulesV2)) {
    plugin.pluginData.settings.rulesV2 = [];
  }

  if (plugin.pluginData.schemaVersion === undefined) {
    plugin.pluginData.schemaVersion = 1;
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

  plugin.pluginData.settings.filters.filter =
    plugin.pluginData.settings.filters.filter.filter(
      f => f && typeof f.value === 'string' && f.value.trim() !== ''
    );

  if (
    RuleMigrationService.shouldMigrate(
      settingsWithLegacy.rules ?? [],
      plugin.pluginData.settings.rulesV2 ?? []
    )
  ) {
    console.debug('Migrating Rule V1 to Rule V2...');
    plugin.pluginData.settings.rulesV2 = RuleMigrationService.migrateRules(
      settingsWithLegacy.rules ?? []
    );
    console.debug(
      `Migrated ${(plugin.pluginData.settings.rulesV2 ?? []).length} rules to V2 format`
    );
    settingsWithLegacy.rules = [];
    await savePersistedSettings(plugin);
  } else {
    settingsWithLegacy.rules = [];
  }

  if (
    plugin.pluginData.settings.rulesV2 &&
    plugin.pluginData.settings.rulesV2.length > 0
  ) {
    const migrated = RuleMigrationService.migrateRuleV2Triggers(
      plugin.pluginData.settings.rulesV2
    );
    if (migrated) {
      console.debug(
        'Migrated RuleV2 triggers from ruleType to operator format'
      );
      await savePersistedSettings(plugin);
    }

    const repaired = RuleMigrationService.repairRuleV2Properties(
      plugin.pluginData.settings.rulesV2
    );
    if (repaired) {
      console.debug(
        'Repaired RuleV2 properties triggers with missing propertyName'
      );
      await savePersistedSettings(plugin);
    }
  }

  if (
    plugin.pluginData.settings.rulesV2 &&
    plugin.pluginData.settings.rulesV2.length > 0
  ) {
    const validationResult = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    SettingsValidator.validateRulesV2Array(
      plugin.pluginData.settings.rulesV2,
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
