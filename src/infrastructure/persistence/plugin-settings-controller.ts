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

export async function savePersistedSettings(
  plugin: PluginWithPersistedSettings
): Promise<void> {
  const settingsAny = plugin.settings as any;
  const currentHistory = settingsAny.history;

  if (
    !currentHistory ||
    typeof currentHistory !== 'object' ||
    Array.isArray(currentHistory)
  ) {
    settingsAny.history = { history: [], bulkOperations: [] } as HistoryData;
  }
  if (!Array.isArray(settingsAny.history.history)) {
    settingsAny.history.history = [];
  }
  if (!Array.isArray(settingsAny.history.bulkOperations)) {
    settingsAny.history.bulkOperations = [];
  }

  const s = plugin.settings.settings as any;
  delete s.rules;
  delete s.enableLegacyRules;
  delete s.legacyMigrationDismissed;

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
    } as HistoryData;
  }

  const settingsAny = plugin.settings.settings as any;
  if (!Array.isArray(settingsAny.rules)) {
    settingsAny.rules = [];
  }
  if (!plugin.settings.settings.filters) {
    plugin.settings.settings.filters = { filter: [] };
  }
  if (!Array.isArray(plugin.settings.settings.filters.filter)) {
    plugin.settings.settings.filters.filter = [];
  }

  if (settingsAny.enableRuleV2 !== undefined) {
    delete settingsAny.enableRuleV2;
    await savePersistedSettings(plugin);
  }
  delete settingsAny.enableLegacyRules;
  delete settingsAny.legacyMigrationDismissed;

  if (plugin.settings.settings.enableRuleEvaluationCache === undefined) {
    plugin.settings.settings.enableRuleEvaluationCache = true;
  }

  if (plugin.settings.settings.enableVaultIndexCache === undefined) {
    plugin.settings.settings.enableVaultIndexCache = true;
  }

  if (plugin.settings.settings.enablePerformanceDebug === undefined) {
    plugin.settings.settings.enablePerformanceDebug = false;
  }

  if (!Array.isArray(plugin.settings.settings.rulesV2)) {
    plugin.settings.settings.rulesV2 = [];
  }

  if (plugin.settings.schemaVersion === undefined) {
    plugin.settings.schemaVersion = 1;
  }

  const legacyRules = Array.isArray(settingsAny.rules) ? settingsAny.rules : [];
  settingsAny.rules = legacyRules.filter(
    (rule: any) =>
      rule &&
      rule.criteria &&
      rule.path &&
      String(rule.criteria).trim() !== '' &&
      String(rule.path).trim() !== ''
  );

  plugin.settings.settings.filters.filter =
    plugin.settings.settings.filters.filter.filter(
      f => f && typeof f.value === 'string' && f.value.trim() !== ''
    );

  if (
    RuleMigrationService.shouldMigrate(
      settingsAny.rules,
      plugin.settings.settings.rulesV2 ?? []
    )
  ) {
    console.log('Migrating Rule V1 to Rule V2...');
    plugin.settings.settings.rulesV2 = RuleMigrationService.migrateRules(
      settingsAny.rules
    );
    console.log(
      `Migrated ${(plugin.settings.settings.rulesV2 ?? []).length} rules to V2 format`
    );
    settingsAny.rules = [];
    await savePersistedSettings(plugin);
  } else {
    settingsAny.rules = [];
  }

  if (
    plugin.settings.settings.rulesV2 &&
    plugin.settings.settings.rulesV2.length > 0
  ) {
    const migrated = RuleMigrationService.migrateRuleV2Triggers(
      plugin.settings.settings.rulesV2
    );
    if (migrated) {
      console.log('Migrated RuleV2 triggers from ruleType to operator format');
      await savePersistedSettings(plugin);
    }

    const repaired = RuleMigrationService.repairRuleV2Properties(
      plugin.settings.settings.rulesV2
    );
    if (repaired) {
      console.log(
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
  const defaults = SETTINGS_CONSTANTS.DEFAULT_SETTINGS as any;
  return {
    triggers: {
      enablePeriodicMovement: !!defaults.enablePeriodicMovement,
      periodicMovementInterval: defaults.periodicMovementInterval ?? 5,
      enableOnEditTrigger: !!defaults.enableOnEditTrigger,
    },
    filters: {
      filter: Array.isArray(defaults.filter)
        ? (defaults.filter as string[]).map(v => ({ value: v }) as Filter)
        : [],
    },
    retentionPolicy: defaults.retentionPolicy,
    rulesV2: [],
    enableRuleEvaluationCache: true,
    enableVaultIndexCache: true,
    enablePerformanceDebug: false,
  } as SettingsData;
}

function migrateFromLegacy(legacy: any): PluginData {
  const defaults = SETTINGS_CONSTANTS.DEFAULT_SETTINGS as any;

  const enablePeriodicMovement =
    legacy?.enablePeriodicMovement ?? defaults.enablePeriodicMovement ?? false;
  const periodicMovementInterval =
    legacy?.periodicMovementInterval ?? defaults.periodicMovementInterval ?? 5;
  const enableOnEditTrigger =
    legacy?.enableOnEditTrigger ?? defaults.enableOnEditTrigger ?? false;
  const retentionPolicy = legacy?.retentionPolicy ?? defaults.retentionPolicy;

  const rules: LegacyRuleV1[] = Array.isArray(legacy?.rules)
    ? legacy.rules
    : [];
  const filterValues: string[] = Array.isArray(legacy?.filter)
    ? legacy.filter
    : [];
  const filters: Filter[] = filterValues
    .filter(v => typeof v === 'string')
    .map(v => ({ value: v }));

  const historyArray = Array.isArray(legacy?.history) ? legacy.history : [];
  const bulkOps = Array.isArray(legacy?.bulkOperations)
    ? legacy.bulkOperations
    : [];

  const data: PluginData = {
    settings: {
      triggers: {
        enablePeriodicMovement,
        periodicMovementInterval,
        enableOnEditTrigger,
      },
      filters: { filter: filters },
      rules,
      rulesV2: [],
      retentionPolicy,
      enableRuleEvaluationCache: true,
      enableVaultIndexCache: true,
      enablePerformanceDebug: false,
    } as unknown as SettingsData,
    history: {
      history: historyArray,
      bulkOperations: bulkOps,
    },
    lastSeenVersion: legacy?.lastSeenVersion,
    schemaVersion: 1,
  };

  return data;
}

async function backupLegacyDataJson(
  plugin: PluginWithPersistedSettings
): Promise<void> {
  try {
    const configDir = (plugin.app.vault as any).configDir || '.obsidian';
    const adapter: any = plugin.app.vault.adapter as any;
    const dataPath = `${configDir}/plugins/${plugin.manifest.id}/data.json`;
    const exists = await adapter.exists?.(dataPath);
    if (!exists) return;
    const iso = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configDir}/plugins/${plugin.manifest.id}/data.backup.${iso}.json`;
    const content = await adapter.read(dataPath);
    await adapter.write(backupPath, content);
  } catch {
    // Best-effort backup; ignore errors
  }
}
