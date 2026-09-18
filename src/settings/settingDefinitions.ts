import type { ButtonComponent, Setting, SettingDefinitionItem } from 'obsidian';
import type AdvancedNoteMoverPlugin from 'main';
import { ConfirmModal } from '../modals/ConfirmModal';
import { SETTINGS_CONSTANTS, HISTORY_CONSTANTS } from '../config/constants';
import { persistConflictResolutionStrategy } from '../application/persist-conflict-resolution-strategy';
import { strategyRequiresWarning } from '../domain/conflicts/note-move-conflict';
import type { ConflictResolutionStrategy } from '../types/ConflictResolution';
import type { RuleV2 } from '../types/RuleV2';
import { toMarkdownInlineCode } from '../utils/markdown-confirm';
import { handleError } from '../utils/Error';
import { NoticeManager } from '../utils/NoticeManager';
import {
  STRATEGY_DESCRIPTIONS,
  STRATEGY_LABELS,
} from './sections/ConflictResolutionSettingsSection';
import type { FilterSettingsSection } from './sections/FilterSettingsSection';
import type { ImportExportSettingsSection } from './sections/ImportExportSettingsSection';
import type { RulesSettingsSection } from './sections/RulesSettingsSection';

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
      heading: 'Triggers',
      items: [
        {
          name: 'Enable on-edit trigger',
          desc: 'Automatically check and move the edited note when a file is modified',
          control: {
            type: 'toggle',
            key: 'triggers.enableOnEditTrigger',
            defaultValue: false,
          },
        },
        {
          name: 'Enable periodic movement',
          desc: 'Enable the periodic movement of notes',
          control: {
            type: 'toggle',
            key: 'triggers.enablePeriodicMovement',
            defaultValue: false,
          },
        },
        {
          name: 'Periodic movement interval',
          desc: 'Set the interval for the periodic movement of notes in minutes',
          visible: () => settings.triggers.enablePeriodicMovement,
          control: {
            type: 'number',
            key: 'triggers.periodicMovementInterval',
            min: 1,
            placeholder: SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.INTERVAL,
            validate: (value: number) =>
              !Number.isFinite(value) || value < 1
                ? 'Interval must be greater than 0'
                : undefined,
          },
        },
      ],
    },
    {
      type: 'group',
      heading: 'Filter',
      items: [
        {
          name: 'Blacklist filters',
          desc: 'Files that match any criterion are excluded from move operations.',
        },
      ],
    },
    {
      type: 'list',
      emptyState:
        'No filters are configured. Add one using the control below to exclude files from move operations.',
      addItem: {
        name: 'Add new filter',
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
        name: filter.value || 'New filter',
        searchable: false,
        render: (setting: Setting) => {
          setting.infoEl.remove();
          return host.filterSettings.bindFilterSearch(setting, index);
        },
      })),
    },
    {
      type: 'group',
      heading: 'Rules',
      items: [
        {
          name: 'Move rules',
          desc: createFragment(frag => {
            frag.appendText(
              'The Advanced Note Mover will move files to the folder associated with the specified criteria.'
            );
            frag.createEl('br');
            frag.appendText(
              'Criteria can be tags, filenames, paths, content, properties, or dates. If multiple rules match, the first one will be applied.'
            );
          }),
        },
        {
          name: SETTINGS_CONSTANTS.UI_TEXTS.CREATE_MISSING_FOLDERS_NAME,
          desc: SETTINGS_CONSTANTS.UI_TEXTS.CREATE_MISSING_FOLDERS_DESC,
          control: {
            type: 'toggle',
            key: 'createMissingDestinationFolders',
            defaultValue: true,
          },
        },
        {
          name: 'Re-evaluate vault',
          desc: 'After changing rules, preview which files would move to their new destinations before applying any moves.',
          render: setting => {
            let reEvaluateButton: ButtonComponent | undefined;
            setting.addButton(btn => {
              reEvaluateButton = btn
                .setButtonText('Re-evaluate vault with current rules')
                .onClick(() => {
                  if (reEvaluateButton) {
                    reEvaluateButton.setDisabled(true);
                    reEvaluateButton.setButtonText('Generating preview…');
                  }
                  void (async () => {
                    try {
                      await plugin.advancedNoteMover.openVaultReEvaluationPreview();
                    } catch (error) {
                      handleError(
                        error,
                        'Error generating vault preview',
                        false
                      );
                      NoticeManager.error(
                        `Error generating preview: ${error instanceof Error ? error.message : String(error)}`
                      );
                    } finally {
                      if (reEvaluateButton) {
                        reEvaluateButton.setDisabled(false);
                        reEvaluateButton.setButtonText(
                          'Re-evaluate vault with current rules'
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
      emptyState: 'No rules are configured. Add one using the control below.',
      addItem: {
        name: 'Add rule',
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
      items: rules.map((rule, index) => ({
        name: rule.name || 'Unnamed rule',
        searchable: false,
        render: (setting: Setting) => bindRuleRow(host, setting, rule, index),
      })),
    },
    {
      type: 'group',
      heading: 'Attachments',
      items: [
        {
          name: 'Move attachments with note',
          desc: 'When a markdown note is moved, also move images and other attachments referenced in the note that live in the note folder or its subfolders (e.g. _assets/). Relative link structure is preserved.',
          control: {
            type: 'toggle',
            key: 'attachments.moveWithNote',
            defaultValue: false,
          },
        },
        {
          name: 'Skip shared attachments',
          desc: 'Do not move attachment files that are also linked from other notes. Prevents breaking references elsewhere in the vault.',
          visible: () => settings.attachments?.moveWithNote === true,
          control: {
            type: 'toggle',
            key: 'attachments.skipSharedAttachments',
            defaultValue: true,
          },
        },
        {
          name: 'Delete empty asset folders',
          desc: 'After moving attachments, remove source folders (such as _assets) that no longer contain any files.',
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
      heading: 'Conflict resolution',
      items: [
        {
          name: 'When target file exists',
          desc: STRATEGY_DESCRIPTIONS[strategy],
          control: {
            type: 'dropdown',
            key: 'conflictResolution.strategy',
            defaultValue: 'skip',
            options: STRATEGY_LABELS,
          },
        },
        {
          name: 'Automatic conflict handling',
          desc: strategyRequiresWarning(strategy)
            ? 'Warning: Always overwrite will replace existing files at the destination without confirmation. You may lose data.'
            : 'Warning: Conflicts will be handled automatically without asking. You can change this setting at any time.',
          searchable: false,
          visible: () => strategy !== 'ask',
        },
      ],
    },
    {
      type: 'group',
      heading: 'History',
      items: [
        {
          name: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_TITLE,
          desc: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_DESC,
          control: {
            type: 'number',
            key: 'retentionPolicy.value',
            min: 1,
            placeholder: '30',
            validate: (value: number) =>
              !Number.isFinite(value) || value < 1
                ? 'Retention must be greater than 0'
                : undefined,
          },
        },
        {
          name: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_UNIT_LABEL,
          control: {
            type: 'dropdown',
            key: 'retentionPolicy.unit',
            options: {
              days: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_DAYS,
              weeks: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_WEEKS,
              months: SETTINGS_CONSTANTS.UI_TEXTS.RETENTION_POLICY_MONTHS,
            },
          },
        },
        {
          name: 'Clean up old entries',
          desc: `Remove history entries older than ${retention.value} ${retention.unit}`,
          render: setting => {
            setting.addButton(btn =>
              btn
                .setButtonText('Clean up now')
                .setCta()
                .onClick(() => {
                  void plugin.historyManager.cleanupOldEntries();
                })
            );
          },
        },
        {
          name: 'Clear history',
          desc: 'Clears the history of moved notes',
          render: setting => {
            setting.addButton(btn => {
              btn.setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY);
              btn.buttonEl.addClass('mod-warning');
              btn.onClick(async () => {
                const confirmed = await ConfirmModal.show(plugin.app, {
                  title: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_TITLE,
                  message: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_MESSAGE,
                  confirmText:
                    SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CONFIRM,
                  cancelText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CANCEL,
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
      heading: 'Import/export',
      items: [
        {
          name: 'Export settings',
          desc: 'Export your current settings as a JSON file',
          render: setting => {
            setting.addButton(btn => {
              btn
                .setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.EXPORT_SETTINGS)
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
          name: 'Import settings',
          desc: 'Import settings from a JSON file',
          render: setting => {
            setting.addButton(btn => {
              btn.setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS);
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
      heading: 'Performance',
      items: [
        {
          name: 'Enable rule evaluation cache',
          desc: createFragment(frag => {
            frag.appendText(
              'Cache rule evaluation results so unchanged files are not re-evaluated on every periodic or on-edit run.'
            );
            frag.createEl('br');
            frag.appendText(
              'This significantly improves performance for vaults with many files and rules.'
            );
          }),
          control: {
            type: 'toggle',
            key: 'enableRuleEvaluationCache',
            defaultValue: true,
          },
        },
        {
          name: 'Enable vault index cache',
          desc: 'Caches movable file lists (notes, canvases, bases) and derived tag/property indices from markdown. Turn off to always scan the vault (useful for debugging stale suggestions).',
          control: {
            type: 'toggle',
            key: 'enableVaultIndexCache',
            defaultValue: true,
          },
        },
        {
          name: 'Enable performance debug logs',
          desc: 'Logs timing spans to the developer console as [Advanced Note Mover perf] and records them for export. Disable when not profiling.',
          control: {
            type: 'toggle',
            key: 'enablePerformanceDebug',
            defaultValue: false,
          },
        },
        {
          name: 'Export performance trace',
          desc:
            settings.enablePerformanceDebug === true
              ? 'Writes recorded timings as JSON to _note-mover-traces/ in your vault for before/after comparison.'
              : 'Turn on performance debug logs first to record timings.',
          render: setting => {
            setting.addButton(btn =>
              btn
                .setButtonText('Export trace JSON')
                .setDisabled(settings.enablePerformanceDebug !== true)
                .onClick(async () => {
                  if (
                    plugin.pluginData.settings.enablePerformanceDebug !== true
                  ) {
                    NoticeManager.warning(
                      'Enable performance debug logs first, then run the actions you want to measure.'
                    );
                    return;
                  }
                  try {
                    const path =
                      await plugin.performanceTrace.writeExportToVault(
                        plugin.app
                      );
                    NoticeManager.success(`Performance trace saved: ${path}`);
                  } catch (err) {
                    NoticeManager.error(
                      `Could not export trace: ${err instanceof Error ? err.message : String(err)}`
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
      heading: 'Updates',
      items: [
        {
          name: 'Show release notes after plugin update',
          desc: 'When enabled, opens the changelog modal once after you install a newer plugin version. Applies across all vaults; does not show on every startup or vault switch.',
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

function bindRuleRow(
  host: SettingDefinitionsHost,
  setting: Setting,
  rule: RuleV2,
  index: number
): void {
  const plugin = host.plugin;
  setting.addToggle(toggle =>
    toggle
      .setValue(rule.active)
      .setTooltip(rule.active ? 'Rule is active' : 'Rule is inactive')
      .onChange(async value => {
        if (!plugin.pluginData.settings.rulesV2) {
          return;
        }
        plugin.pluginData.settings.rulesV2[index].active = value;
        await plugin.save_settings();
        plugin.advancedNoteMover.updateRuleManager();
      })
  );
  setting.addExtraButton(btn =>
    btn
      .setIcon('pencil')
      .setTooltip('Edit rule')
      .onClick(() => {
        host.rulesSettings.openRuleEditorModal(index);
      })
  );
  setting.addExtraButton(btn =>
    btn
      .setIcon('copy')
      .setTooltip('Clone rule')
      .onClick(async () => {
        if (!plugin.pluginData.settings.rulesV2) {
          plugin.pluginData.settings.rulesV2 = [];
        }
        const clonedRule = structuredClone(rule);
        const baseName = rule.name?.trim() || 'Unnamed Rule';
        clonedRule.name = `${baseName} (copy)`;
        plugin.pluginData.settings.rulesV2.splice(index + 1, 0, clonedRule);
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
}

async function deleteRule(
  host: SettingDefinitionsHost,
  index: number
): Promise<void> {
  const rules = host.plugin.pluginData.settings.rulesV2 ?? [];
  const rule = rules[index];
  const ruleLabel = toMarkdownInlineCode(rule?.name || 'Unnamed Rule');
  const confirmed = await ConfirmModal.show(host.plugin.app, {
    title: SETTINGS_CONSTANTS.UI_TEXTS.DELETE_RULE_TITLE,
    message: `Are you sure you want to delete the rule ${ruleLabel}?\n\nThis action cannot be undone.`,
    confirmText: SETTINGS_CONSTANTS.UI_TEXTS.DELETE_RULE_CONFIRM,
    cancelText: 'Cancel',
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
