import { Setting } from 'obsidian';
import { strings } from '../i18n/locale';

export const SETTING_SECTION_IDS = [
  'triggers',
  'filters',
  'rules',
  'attachments',
  'conflict',
  'history',
  'importExport',
  'performance',
  'updates',
] as const;

export type SettingSectionId = (typeof SETTING_SECTION_IDS)[number];

export type SettingControlKind =
  'heading' | 'info' | 'toggle' | 'text' | 'dropdown' | 'button';

export interface SettingDefinition {
  id: string;
  sectionId: SettingSectionId;
  /** Dot path in languages/en.json, for example settings.triggersOnEditName. */
  nameKey: string;
  descriptionKey?: string;
  control: SettingControlKind;
}

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    id: 'triggers.heading',
    sectionId: 'triggers',
    nameKey: 'settings.headingsTriggers',
    control: 'heading',
  },
  {
    id: 'triggers.onEdit',
    sectionId: 'triggers',
    nameKey: 'settings.triggersOnEditName',
    descriptionKey: 'settings.triggersOnEditDesc',
    control: 'toggle',
  },
  {
    id: 'triggers.periodic',
    sectionId: 'triggers',
    nameKey: 'settings.triggersPeriodicName',
    descriptionKey: 'settings.triggersPeriodicDesc',
    control: 'toggle',
  },
  {
    id: 'triggers.interval',
    sectionId: 'triggers',
    nameKey: 'settings.triggersIntervalName',
    descriptionKey: 'settings.triggersIntervalDesc',
    control: 'text',
  },
  {
    id: 'filters.heading',
    sectionId: 'filters',
    nameKey: 'settings.headingsFilter',
    descriptionKey: 'settings.filterSearchDesc',
    control: 'heading',
  },
  {
    id: 'filters.empty',
    sectionId: 'filters',
    nameKey: 'settings.filterEmpty',
    control: 'info',
  },
  {
    id: 'filters.add',
    sectionId: 'filters',
    nameKey: 'settings.filterAdd',
    control: 'button',
  },
  {
    id: 'rules.heading',
    sectionId: 'rules',
    nameKey: 'settings.headingsRules',
    control: 'heading',
  },
  {
    id: 'rules.createFolders',
    sectionId: 'rules',
    nameKey: 'settings.rulesCreateFoldersName',
    descriptionKey: 'settings.rulesCreateFoldersDesc',
    control: 'toggle',
  },
  {
    id: 'rules.empty',
    sectionId: 'rules',
    nameKey: 'settings.rulesEmpty',
    control: 'info',
  },
  {
    id: 'rules.reEvaluate',
    sectionId: 'rules',
    nameKey: 'settings.rulesReEvaluateName',
    descriptionKey: 'settings.rulesReEvaluateDesc',
    control: 'button',
  },
  {
    id: 'rules.add',
    sectionId: 'rules',
    nameKey: 'settings.rulesAddButton',
    control: 'button',
  },
  {
    id: 'attachments.heading',
    sectionId: 'attachments',
    nameKey: 'settings.headingsAttachments',
    control: 'heading',
  },
  {
    id: 'attachments.move',
    sectionId: 'attachments',
    nameKey: 'settings.attachmentsMoveName',
    descriptionKey: 'settings.attachmentsMoveDesc',
    control: 'toggle',
  },
  {
    id: 'attachments.skip',
    sectionId: 'attachments',
    nameKey: 'settings.attachmentsSkipName',
    descriptionKey: 'settings.attachmentsSkipDesc',
    control: 'toggle',
  },
  {
    id: 'attachments.deleteEmpty',
    sectionId: 'attachments',
    nameKey: 'settings.attachmentsDeleteEmptyName',
    descriptionKey: 'settings.attachmentsDeleteEmptyDesc',
    control: 'toggle',
  },
  {
    id: 'conflict.heading',
    sectionId: 'conflict',
    nameKey: 'settings.headingsConflict',
    control: 'heading',
  },
  {
    id: 'conflict.strategy',
    sectionId: 'conflict',
    nameKey: 'settings.conflictWhenExists',
    control: 'dropdown',
  },
  {
    id: 'conflict.warning',
    sectionId: 'conflict',
    nameKey: 'settings.conflictAutoName',
    control: 'info',
  },
  {
    id: 'history.heading',
    sectionId: 'history',
    nameKey: 'settings.headingsHistory',
    control: 'heading',
  },
  {
    id: 'history.retention',
    sectionId: 'history',
    nameKey: 'settings.historyRetentionName',
    descriptionKey: 'settings.historyRetentionDesc',
    control: 'text',
  },
  {
    id: 'history.cleanup',
    sectionId: 'history',
    nameKey: 'settings.historyCleanupName',
    control: 'button',
  },
  {
    id: 'history.clear',
    sectionId: 'history',
    nameKey: 'settings.historyClearName',
    descriptionKey: 'settings.historyClearDesc',
    control: 'button',
  },
  {
    id: 'importExport.heading',
    sectionId: 'importExport',
    nameKey: 'settings.headingsImportExport',
    control: 'heading',
  },
  {
    id: 'importExport.export',
    sectionId: 'importExport',
    nameKey: 'settings.importExportExportName',
    descriptionKey: 'settings.importExportExportDesc',
    control: 'button',
  },
  {
    id: 'importExport.import',
    sectionId: 'importExport',
    nameKey: 'settings.importExportImportName',
    descriptionKey: 'settings.importExportImportDesc',
    control: 'button',
  },
  {
    id: 'performance.heading',
    sectionId: 'performance',
    nameKey: 'settings.headingsPerformance',
    control: 'heading',
  },
  {
    id: 'performance.cache',
    sectionId: 'performance',
    nameKey: 'settings.performanceCacheName',
    control: 'toggle',
  },
  {
    id: 'performance.vaultCache',
    sectionId: 'performance',
    nameKey: 'settings.performanceVaultCacheName',
    descriptionKey: 'settings.performanceVaultCacheDesc',
    control: 'toggle',
  },
  {
    id: 'performance.debug',
    sectionId: 'performance',
    nameKey: 'settings.performanceDebugName',
    descriptionKey: 'settings.performanceDebugDesc',
    control: 'toggle',
  },
  {
    id: 'performance.export',
    sectionId: 'performance',
    nameKey: 'settings.performanceExportName',
    control: 'button',
  },
  {
    id: 'updates.heading',
    sectionId: 'updates',
    nameKey: 'settings.headingsUpdates',
    control: 'heading',
  },
  {
    id: 'updates.releaseNotes',
    sectionId: 'updates',
    nameKey: 'settings.updatesReleaseNotesName',
    descriptionKey: 'settings.updatesReleaseNotesDesc',
    control: 'toggle',
  },
];

const definitionsById = new Map(
  SETTING_DEFINITIONS.map(definition => [definition.id, definition])
);

export function settingDefinition(id: string): SettingDefinition {
  const definition = definitionsById.get(id);
  if (!definition) {
    throw new Error(`Unknown setting ${id}`);
  }
  return definition;
}

/** Reads one string from the active locale catalog. */
export function catalogText(key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object' || !(part in current)) {
      throw new Error(`Missing languages/en.json key ${key}`);
    }
    return (current as Record<string, unknown>)[part];
  }, strings());
  if (typeof value !== 'string') {
    throw new Error(`languages/en.json key ${key} is not a string`);
  }
  return value;
}

/** Draws the name, description, and heading for one definition. The caller adds the control. */
export function renderSetting(container: HTMLElement, id: string): Setting {
  const definition = settingDefinition(id);
  const setting = new Setting(container);
  setting.settingEl.dataset.settingId = definition.id;
  setting.settingEl.dataset.sectionId = definition.sectionId;
  setting.setName(catalogText(definition.nameKey));
  if (definition.descriptionKey) {
    setting.setDesc(catalogText(definition.descriptionKey));
  }
  if (definition.control === 'heading') {
    setting.setHeading();
  }
  return setting;
}
