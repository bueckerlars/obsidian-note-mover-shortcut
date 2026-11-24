import type { ButtonComponent, Setting, SettingDefinitionItem } from 'obsidian';
import type AdvancedNoteMoverPlugin from 'main';
import { ConfirmModal } from '../modals/ConfirmModal';
import { HISTORY_CONSTANTS } from '../config/constants';
import { persistConflictResolutionStrategy } from '../application/persist-conflict-resolution-strategy';
import { strategyRequiresWarning } from '../domain/conflicts/note-move-conflict';
import type { ConflictResolutionStrategy } from '../types/ConflictResolution';
import type { RuleV2 } from '../types/RuleV2';
import { toMarkdownInlineCode } from '../utils/markdown-confirm';
import { handleError } from '../utils/Error';
import { NoticeManager } from '../utils/NoticeManager';
import { fill, strings } from '../i18n/locale';
import type { FilterSettingsSection } from './sections/FilterSettingsSection';
import type { ImportExportSettingsSection } from './sections/ImportExportSettingsSection';
import type { RulesSettingsSection } from './sections/RulesSettingsSection';
import { parsePeriodicIntervalMinutes } from './intervalInput';
import { setDebugEnabled } from '../utils/debug';
import { cloneRule } from './cloneRule';

export interface SettingDefinitionsHost {
  plugin: AdvancedNoteMoverPlugin;
  filterSettings: FilterSettingsSection;
  rulesSettings: RulesSettingsSection;
  importExportSettings: ImportExportSettingsSection;
  update(): void;
  refreshDomState(): void;
}

const CONTROL_DEFAULTS: Record<string, unknown> = {
  enableRuleEvaluationCache: true,
  enableVaultIndexCache: true,
  enablePerformanceDebug: false,
  showReleaseNotesOnUpdate: true,
  createMissingDestinationFolders: true,
  'attachments.moveWithNote': false,
  'attachments.skipSharedAttachments': true,
  'attachments.deleteEmptyAssetFolders': false,
  'conflictResolution.strategy': 'skip',
};

const VISIBILITY_KEYS = new Set([
  'triggers.enablePeriodicMovement',
  'attachments.moveWithNote',
]);

const RERENDER_KEYS = new Set(['enablePerformanceDebug']);

export function getNestedSettingValue(
  plugin: AdvancedNoteMoverPlugin,
  key: string
): unknown {
  const value = getPath(plugin.pluginData.settings, key);
  return value ?? CONTROL_DEFAULTS[key];
}

export async function setNestedSettingValue(
  host: SettingDefinitionsHost,
  key: string,
  value: unknown
): Promise<void> {
  const plugin = host.plugin;
  ensureNestedSettings(plugin, key);

  if (key === 'conflictResolution.strategy') {
    await persistConflictResolutionStrategy(
      plugin,
      value as ConflictResolutionStrategy
    );
    host.update();
    return;
  }

  setPath(
    plugin.pluginData.settings as unknown as Record<string, unknown>,
    key,
    value
  );
  await plugin.save_settings();
  await applySettingSideEffects(host, key, value);
}

export function buildSettingDefinitions(
  host: SettingDefinitionsHost
): SettingDefinitionItem[] {
  const plugin = host.plugin;
  const settings = plugin.pluginData.settings;
  const filters = settings.filters?.filter ?? [];
  const rules = settings.rulesV2 ?? [];
  const retention =
    settings.retentionPolicy ?? HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY;
  const strategy =
    (settings.conflictResolution?.strategy as ConflictResolutionStrategy) ??
    'skip';

  return [
    {
      type: 'group',
      heading: strings().settings.headingsTriggers,
      items: [
        {
          name: strings().settings.triggersOnEditName,
          desc: strings().settings.triggersOnEditDesc,
          control: {
            type: 'toggle',
            key: 'triggers.enableOnEditTrigger',
            defaultValue: false,
          },
        },
        {
          name: strings().settings.triggersPeriodicName,
          desc: strings().settings.triggersPeriodicDesc,
          control: {
            type: 'toggle',
            key: 'triggers.enablePeriodicMovement',
            defaultValue: false,
          },
        },
        {
          name: strings().settings.triggersIntervalName,
          desc: strings().settings.triggersIntervalDesc,
          visible: () => settings.triggers.enablePeriodicMovement,
          control: {
            type: 'number',
            key: 'triggers.periodicMovementInterval',
            min: 1,
            placeholder: strings().settings.triggersIntervalPlaceholder,
            validate: (value: number) =>
              parsePeriodicIntervalMinutes(String(value)) === null
                ? strings().settings.triggersIntervalInvalid
                : undefined,
          },
        },
      ],
    },
    {
      type: 'group',
      heading: strings().settings.headingsFilter,
      items: [
        {
          name: strings().settings.filterSearchName,
          desc: strings().settings.filterSearchDesc,
        },
      ],
    },
    {
      type: 'list',
      emptyState: strings().settings.filterEmpty,
      addItem: {
        name: strings().settings.filterAdd,
        action: () => {
          void addFilter(host);
        },
      },
      onReorder: (fromIndex, toIndex) => {
        void reorderFilters(host, fromIndex, toIndex);
      },
      onDelete: index => {
        void deleteFilter(host, index);
      },
      items: filters.map((filter, index) => ({
        name: filter.value || strings().settings.filterNewFilter,
        searchable: false,
        render: (setting: Setting) => {
          setting.infoEl.remove();
          return host.filterSettings.bindFilterSearch(setting, index);
        },
      })),
    },
    {
      type: 'group',
      heading: strings().settings.headingsRules,
      items: [
        {
          name: strings().settings.rulesSearchName,
          desc: createFragment(frag => {
            frag.appendText(strings().settings.rulesIntroLead);
            frag.createEl('br');
            frag.appendText(strings().settings.rulesIntroTail);
          }),
        },
        {
          name: strings().settings.rulesCreateFoldersName,
          desc: strings().settings.rulesCreateFoldersDesc,
          control: {
            type: 'toggle',
            key: 'createMissingDestinationFolders',
            defaultValue: true,
          },
        },
        {
          name: strings().settings.rulesReEvaluateName,
          desc: strings().settings.rulesReEvaluateDesc,
          render: setting => {
            let reEvaluateButton: ButtonComponent | undefined;
            setting.addButton(btn => {
              reEvaluateButton = btn
                .setButtonText(strings().settings.rulesReEvaluateButton)
                .onClick(() => {
                  if (reEvaluateButton) {
                    reEvaluateButton.setDisabled(true);
                    reEvaluateButton.setButtonText(
                      strings().settings.rulesGeneratingPreview
                    );
                  }
                  void (async () => {
                    try {
                      await plugin.advancedNoteMover.openVaultReEvaluationPreview();
                    } catch (error) {
                      handleError(
                        error,
                        strings().notices.errorGeneratingVaultPreviewContext,
                        false
                      );
                      NoticeManager.error(
                        fill(strings().notices.errorGeneratingPreview, {
                          message:
                            error instanceof Error
                              ? error.message
                              : String(error),
                        })
                      );
                    } finally {
                      if (reEvaluateButton) {
                        reEvaluateButton.setDisabled(false);
                        reEvaluateButton.setButtonText(
                          strings().settings.rulesReEvaluateButton
                        );
                      }
                    }
                  })();
                });
            });
          },
        },
      ],
    },
    {
      type: 'list',
      emptyState: strings().settings.rulesEmpty,
      addItem: {
        name: strings().settings.rulesAddSearch,
        action: () => {
          host.rulesSettings.openRuleEditorModal(null);
        },
      },
      onReorder: (fromIndex, toIndex) => {
        void reorderRules(host, fromIndex, toIndex);
      },
      onDelete: index => {
        void deleteRule(host, index);
      },
      items: rules.map(rule => ({
        name: rule.name || strings().unnamedRule,
        searchable: false,
        render: (setting: Setting) => bindRuleRow(host, setting, rule),
      })),
    },
    {
      type: 'group',
      heading: strings().settings.headingsAttachments,
      items: [
        {
          name: strings().settings.attachmentsMoveName,
          desc: strings().settings.attachmentsMoveDesc,
          control: {
            type: 'toggle',
            key: 'attachments.moveWithNote',
            defaultValue: false,
          },
        },
        {
          name: strings().settings.attachmentsSkipName,
          desc: strings().settings.attachmentsSkipDesc,
          visible: () => settings.attachments?.moveWithNote === true,
          control: {
            type: 'toggle',
            key: 'attachments.skipSharedAttachments',
            defaultValue: true,
          },
        },
        {
          name: strings().settings.attachmentsDeleteEmptyName,
          desc: strings().settings.attachmentsDeleteEmptyDesc,
          visible: () => settings.attachments?.moveWithNote === true,
          control: {
            type: 'toggle',
            key: 'attachments.deleteEmptyAssetFolders',
            defaultValue: false,
          },
        },
      ],
    },
    {
      type: 'group',
      heading: strings().settings.headingsConflict,
      items: [
        {
          name: strings().settings.conflictWhenExists,
          desc: strings().conflictStrategyDescriptions[strategy],
          control: {
            type: 'dropdown',
            key: 'conflictResolution.strategy',
            defaultValue: 'skip',
            options: strings().conflictStrategies,
          },
        },
        {
          name: strings().settings.conflictAutoName,
          desc: strategyRequiresWarning(strategy)
            ? strings().settings.conflictOverwriteWarning
            : strings().settings.conflictAutoWarning,
          searchable: false,
          visible: () => strategy !== 'ask',
        },
      ],
    },
    {
      type: 'group',
      heading: strings().settings.headingsHistory,
      items: [
        {
          name: strings().settings.historyRetentionName,
          desc: strings().settings.historyRetentionDesc,
          control: {
            type: 'number',
            key: 'retentionPolicy.value',
            min: 1,
            placeholder: strings().settings.historyRetentionPlaceholder,
            validate: (value: number) =>
              !Number.isFinite(value) || value < 1
                ? strings().settings.historyRetentionInvalid
                : undefined,
          },
        },
        {
          name: strings().settings.historyUnitName,
          control: {
            type: 'dropdown',
            key: 'retentionPolicy.unit',
            options: {
              days: strings().settings.historyDays,
              weeks: strings().settings.historyWeeks,
              months: strings().settings.historyMonths,
            },
          },
        },
        {
          name: strings().settings.historyCleanupName,
          desc: fill(strings().settings.historyCleanupDesc, {
            value: retention.value,
            unit: retention.unit,
          }),
          render: setting => {
            setting.addButton(btn =>
              btn
                .setButtonText(strings().settings.historyCleanupButton)
                .setCta()
                .onClick(() => {
                  void plugin.historyManager.cleanupOldEntries();
                })
            );
          },
        },
        {
          name: strings().settings.historyClearName,
          desc: strings().settings.historyClearDesc,
          render: setting => {
            setting.addButton(btn => {
              btn.setButtonText(strings().settings.historyClearButton);
              btn.buttonEl.addClass('mod-warning');
              btn.onClick(async () => {
                const confirmed = await ConfirmModal.show(plugin.app, {
                  title: strings().settings.historyClearTitle,
                  message: strings().settings.historyClearMessage,
                  confirmText: strings().settings.historyClearConfirm,
                  cancelText: strings().common.cancel,
                  danger: true,
                });
                if (confirmed) {
                  await plugin.historyManager.clearHistory();
                }
              });
            });
          },
        },
      ],
    },
    {
      type: 'group',
      heading: strings().settings.headingsImportExport,
      items: [
        {
          name: strings().settings.importExportExportName,
          desc: strings().settings.importExportExportDesc,
          render: setting => {
            setting.addButton(btn => {
              btn
                .setButtonText(strings().settings.importExportExportButton)
                .setCta()
                .onClick(() => {
                  void (async () => {
                    btn.setDisabled(true);
                    try {
                      await host.importExportSettings.exportSettings();
                    } finally {
                      btn.setDisabled(false);
                    }
                  })();
                });
            });
          },
        },
        {
          name: strings().settings.importExportImportName,
          desc: strings().settings.importExportImportDesc,
          render: setting => {
            setting.addButton(btn => {
              btn.setButtonText(strings().settings.importExportImportButton);
              btn.buttonEl.addClass('mod-warning');
              btn.onClick(() => {
                void (async () => {
                  btn.setDisabled(true);
                  try {
                    await host.importExportSettings.importSettings();
                  } finally {
                    btn.setDisabled(false);
                  }
                })();
              });
            });
          },
        },
      ],
    },
    {
      type: 'group',
      heading: strings().settings.headingsPerformance,
      items: [
        {
          name: strings().settings.performanceCacheName,
          desc: createFragment(frag => {
            frag.appendText(strings().settings.performanceCacheLead);
            frag.createEl('br');
            frag.appendText(strings().settings.performanceCacheTail);
          }),
          control: {
            type: 'toggle',
            key: 'enableRuleEvaluationCache',
            defaultValue: true,
          },
        },
        {
          name: strings().settings.performanceVaultCacheName,
          desc: strings().settings.performanceVaultCacheDesc,
          control: {
            type: 'toggle',
            key: 'enableVaultIndexCache',
            defaultValue: true,
          },
        },
        {
          name: strings().settings.performanceDebugName,
          desc: strings().settings.performanceDebugDesc,
          control: {
            type: 'toggle',
            key: 'enablePerformanceDebug',
            defaultValue: false,
          },
        },
        {
          name: strings().settings.performanceExportName,
          desc:
            settings.enablePerformanceDebug === true
              ? strings().settings.performanceExportReady
              : strings().settings.performanceExportOff,
          render: setting => {
            setting.addButton(btn =>
              btn
                .setButtonText(strings().settings.performanceExportButton)
                .setDisabled(settings.enablePerformanceDebug !== true)
                .onClick(async () => {
                  if (
                    plugin.pluginData.settings.enablePerformanceDebug !== true
                  ) {
                    NoticeManager.warning(strings().notices.enableDebugFirst);
                    return;
                  }
                  try {
                    const fileName =
                      await plugin.performanceTrace.downloadExport();
                    if (fileName) {
                      NoticeManager.success(
                        fill(strings().notices.traceDownloaded, { fileName })
                      );
                    }
                  } catch (err) {
                    NoticeManager.error(
                      fill(strings().notices.couldNotExportTrace, {
                        message:
                          err instanceof Error ? err.message : String(err),
                      })
                    );
                  }
                })
            );
          },
        },
      ],
    },
    {
      type: 'group',
      heading: strings().settings.headingsUpdates,
      items: [
        {
          name: strings().settings.updatesReleaseNotesName,
          desc: strings().settings.updatesReleaseNotesDesc,
          control: {
            type: 'toggle',
            key: 'showReleaseNotesOnUpdate',
            defaultValue: true,
          },
        },
      ],
    },
  ];
}

function findRuleIndex(rules: RuleV2[] | undefined, rule: RuleV2): number {
  return rules?.indexOf(rule) ?? -1;
}

function bindRuleRow(
  host: SettingDefinitionsHost,
  setting: Setting,
  rule: RuleV2
): void {
  const plugin = host.plugin;
  setting.addToggle(toggle =>
    toggle
      .setValue(rule.active)
      .setTooltip(
        rule.active
          ? strings().settings.rulesActive
          : strings().settings.rulesInactive
      )
      .onChange(async value => {
        const rules = plugin.pluginData.settings.rulesV2;
        const currentIndex = findRuleIndex(rules, rule);
        if (!rules || currentIndex < 0) {
          return;
        }
        rules[currentIndex].active = value;
        await plugin.save_settings();
        plugin.advancedNoteMover.updateRuleManager();
      })
  );
  setting.addExtraButton(btn =>
    btn
      .setIcon('pencil')
      .setTooltip(strings().settings.rulesEdit)
      .onClick(() => {
        const currentIndex = findRuleIndex(
          plugin.pluginData.settings.rulesV2,
          rule
        );
        if (currentIndex < 0) {
          return;
        }
        host.rulesSettings.openRuleEditorModal(currentIndex);
      })
  );
  setting.addExtraButton(btn =>
    btn
      .setIcon('copy')
      .setTooltip(strings().settings.rulesClone)
      .onClick(async () => {
        if (!plugin.pluginData.settings.rulesV2) {
          plugin.pluginData.settings.rulesV2 = [];
        }
        const currentIndex = findRuleIndex(
          plugin.pluginData.settings.rulesV2,
          rule
        );
        if (currentIndex < 0) {
          return;
        }
        const clonedRule = cloneRule(rule, plugin.pluginData.settings.rulesV2);
        plugin.pluginData.settings.rulesV2.splice(
          currentIndex + 1,
          0,
          clonedRule
        );
        await host.rulesSettings.persistRulesAndSyncManager();
      })
  );
}

async function addFilter(host: SettingDefinitionsHost): Promise<void> {
  host.plugin.pluginData.settings.filters.filter.push({ value: '' });
  await host.plugin.save_settings();
  host.plugin.advancedNoteMover.updateRuleManager();
  host.update();
}

async function deleteFilter(
  host: SettingDefinitionsHost,
  index: number
): Promise<void> {
  host.plugin.pluginData.settings.filters.filter.splice(index, 1);
  await host.plugin.save_settings();
  host.plugin.advancedNoteMover.updateRuleManager();
  host.update();
}

async function reorderFilters(
  host: SettingDefinitionsHost,
  fromIndex: number,
  toIndex: number
): Promise<void> {
  if (fromIndex === toIndex) {
    return;
  }
  const filters = host.plugin.pluginData.settings.filters.filter;
  const [movedFilter] = filters.splice(fromIndex, 1);
  filters.splice(toIndex, 0, movedFilter);
  await host.plugin.save_settings();
  host.plugin.advancedNoteMover.updateRuleManager();
  host.update();
}

async function reorderRules(
  host: SettingDefinitionsHost,
  fromIndex: number,
  toIndex: number
): Promise<void> {
  const rules = host.plugin.pluginData.settings.rulesV2;
  if (fromIndex === toIndex || !rules) {
    return;
  }
  const [movedRule] = rules.splice(fromIndex, 1);
  rules.splice(toIndex, 0, movedRule);
  await host.plugin.save_settings();
  host.plugin.advancedNoteMover.updateRuleManager();
  host.update();
}

async function deleteRule(
  host: SettingDefinitionsHost,
  index: number
): Promise<void> {
  const rules = host.plugin.pluginData.settings.rulesV2 ?? [];
  const rule = rules[index];
  const ruleLabel = toMarkdownInlineCode(rule?.name || strings().unnamedRule);
  const confirmed = await ConfirmModal.show(host.plugin.app, {
    title: strings().modals.ruleEditorDeleteTitle,
    message: fill(strings().modals.confirmDeleteRule, { rule: ruleLabel }),
    confirmText: strings().common.delete,
    cancelText: strings().common.cancel,
    danger: true,
  });
  if (!confirmed) {
    host.update();
    return;
  }
  rules.splice(index, 1);
  await host.rulesSettings.persistRulesAndSyncManager();
}

async function applySettingSideEffects(
  host: SettingDefinitionsHost,
  key: string,
  value: unknown
): Promise<void> {
  const plugin = host.plugin;
  switch (key) {
    case 'triggers.enableOnEditTrigger':
      plugin.triggerHandler.toggleOnEditListener();
      break;
    case 'triggers.enablePeriodicMovement':
    case 'triggers.periodicMovementInterval':
      plugin.triggerHandler.togglePeriodic();
      break;
    case 'createMissingDestinationFolders':
      plugin.advancedNoteMover.updateRuleManager();
      break;
    case 'enablePerformanceDebug':
      setDebugEnabled(value === true);
      break;
    case 'enableRuleEvaluationCache':
      if (value === false) {
        plugin.ruleCache.invalidateAll();
      }
      break;
    case 'enableVaultIndexCache':
      plugin.vaultIndexCache.invalidateMovableFileList();
      plugin.vaultIndexCache.invalidateMarkdownList();
      break;
    default:
      break;
  }

  if (RERENDER_KEYS.has(key)) {
    host.update();
    return;
  }
  if (VISIBILITY_KEYS.has(key)) {
    host.refreshDomState();
  }
}

function ensureNestedSettings(
  plugin: AdvancedNoteMoverPlugin,
  key: string
): void {
  const settings = plugin.pluginData.settings;
  if (key.startsWith('attachments.')) {
    if (!settings.attachments) {
      settings.attachments = {
        moveWithNote: false,
        skipSharedAttachments: true,
        deleteEmptyAssetFolders: false,
      };
    }
  }
  if (key.startsWith('conflictResolution.')) {
    if (!settings.conflictResolution) {
      settings.conflictResolution = { strategy: 'skip' };
    }
  }
  if (key.startsWith('retentionPolicy.')) {
    if (!settings.retentionPolicy) {
      settings.retentionPolicy = {
        ...HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY,
      };
    }
  }
  if (key.startsWith('triggers.') && !settings.triggers) {
    settings.triggers = {
      enablePeriodicMovement: false,
      periodicMovementInterval: 5,
      enableOnEditTrigger: false,
    };
  }
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, obj);
}

function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split('.');
  const last = keys.pop();
  if (!last) {
    return;
  }
  let current = obj;
  for (const key of keys) {
    const next = current[key];
    if (!next || typeof next !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[last] = value;
}
