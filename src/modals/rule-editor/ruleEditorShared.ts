import type { App } from 'obsidian';
import type {
  AggregationType,
  CriteriaType,
  Operator,
  RuleV2,
  Trigger,
} from '../../types/RuleV2';
import { FolderSuggest } from '../../settings/suggesters/FolderSuggest';
import { TagSuggest } from '../../settings/suggesters/TagSuggest';
import { PropertyValueSuggest } from '../../settings/suggesters/PropertyValueSuggest';
import {
  getDefaultOperatorForCriteriaType,
  getOperatorsForCriteriaType,
  getOperatorsForPropertyType,
  getPropertyTypeFromVault,
} from '../../utils/OperatorMapping';
import { strings } from '../../i18n/locale';
import type { PluginVaultIndexCache } from '../../infrastructure/cache/plugin-vault-index-cache';

/** Condition types as the type menu groups them, with their icons. */
export const CRITERIA_GROUPS: ReadonlyArray<{
  group: 'content' | 'file' | 'dates';
  types: ReadonlyArray<readonly [CriteriaType, string]>;
}> = [
  {
    group: 'content',
    types: [
      ['tag', 'tag'],
      ['properties', 'text'],
      ['links', 'link'],
      ['embeds', 'copy'],
      ['headings', 'hash'],
    ],
  },
  {
    group: 'file',
    types: [
      ['fileName', 'file'],
      ['folder', 'folder'],
      ['extension', 'file'],
    ],
  },
  {
    group: 'dates',
    types: [
      ['created_at', 'calendar'],
      ['modified_at', 'clock'],
    ],
  },
];

export function criteriaIcon(criteriaType: CriteriaType): string {
  for (const { types } of CRITERIA_GROUPS) {
    const found = types.find(([type]) => type === criteriaType);
    if (found) return found[1];
  }
  return 'text';
}

export const AGGREGATION_TYPES: readonly AggregationType[] = [
  'all',
  'any',
  'none',
];

export type FolderCreationValue = 'inherit' | 'always' | 'never';

export function criteriaLabel(criteriaType: CriteriaType): string {
  return strings().ruleEditorTypes[criteriaType];
}

export function createDefaultTrigger(): Trigger {
  return {
    criteriaType: 'tag',
    operator: 'includes item',
    value: '',
  };
}

export function getOperatorsForTrigger(trigger: Trigger): Operator[] {
  if (trigger.criteriaType === 'properties' && trigger.propertyType) {
    return getOperatorsForPropertyType(trigger.propertyType);
  }
  return getOperatorsForCriteriaType(trigger.criteriaType);
}

/** Resets operator and property fields that no longer apply to the new criteria type. */
export function applyCriteriaType(
  trigger: Trigger,
  criteriaType: CriteriaType
): void {
  trigger.criteriaType = criteriaType;
  trigger.operator = getDefaultOperatorForCriteriaType(criteriaType);
  if (criteriaType !== 'properties') {
    delete trigger.propertyName;
    delete trigger.propertyType;
  }
}

/**
 * Updates the property name and detects its type from the vault.
 * @returns true when a property type was detected (operators may have changed)
 */
export function applyPropertyName(
  app: App,
  trigger: Trigger,
  propertyName: string,
  vaultIndexCache?: PluginVaultIndexCache
): boolean {
  trigger.propertyName = propertyName;
  const detectedType = getPropertyTypeFromVault(
    app,
    propertyName,
    vaultIndexCache
  );
  if (detectedType) {
    trigger.propertyType = detectedType;
    return true;
  }
  return false;
}

export function getValuePlaceholder(trigger: Trigger): string {
  return trigger.criteriaType === 'tag'
    ? strings().modals.ruleEditorTagPlaceholder
    : strings().modals.ruleEditorValuePlaceholder;
}

export function attachValueSuggester(
  app: App,
  input: HTMLInputElement,
  trigger: Trigger,
  vaultIndexCache?: PluginVaultIndexCache
): { destroy(): void } | null {
  if (trigger.criteriaType === 'tag') {
    return new TagSuggest(app, input, vaultIndexCache);
  }
  if (trigger.criteriaType === 'folder') {
    return new FolderSuggest(app, input);
  }
  if (
    trigger.criteriaType === 'properties' &&
    trigger.propertyName &&
    trigger.propertyType
  ) {
    return new PropertyValueSuggest(
      app,
      input,
      trigger.propertyName,
      trigger.propertyType,
      vaultIndexCache
    );
  }
  return null;
}

export function getFolderCreationValue(rule: RuleV2): FolderCreationValue {
  if (rule.createDestinationFolder === undefined) {
    return 'inherit';
  }
  return rule.createDestinationFolder ? 'always' : 'never';
}

export function applyFolderCreationValue(
  rule: RuleV2,
  value: FolderCreationValue
): void {
  if (value === 'always') {
    rule.createDestinationFolder = true;
  } else if (value === 'never') {
    rule.createDestinationFolder = false;
  } else {
    delete rule.createDestinationFolder;
  }
}
