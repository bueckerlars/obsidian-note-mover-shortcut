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
  isRegexOperator,
  operatorRequiresValue,
} from '../../utils/OperatorMapping';
import type { PluginVaultIndexCache } from '../../infrastructure/cache/plugin-vault-index-cache';

export const CRITERIA_TYPES: readonly CriteriaType[] = [
  'tag',
  'fileName',
  'folder',
  'created_at',
  'modified_at',
  'extension',
  'links',
  'embeds',
  'properties',
  'headings',
];

export const AGGREGATION_TYPES: readonly AggregationType[] = [
  'all',
  'any',
  'none',
];

export type FolderCreationValue = 'inherit' | 'always' | 'never';

export const DESTINATION_DESCRIPTION =
  'Folder or template where files matching this rule will be moved. Supports {{tag.*}} and {{property.*}} placeholders, including date components such as Archive/{{property.created.year}} and formats such as Journal/{{property.created.YYYY-MM-DD}} or {{property.created.MMM}}. Type {{tag. or {{property. to get template suggestions.';

export const DESTINATION_SHORT_HINT =
  'Folder path or template. Type {{ for suggestions.';

export const DESTINATION_TEMPLATE_EXAMPLES: ReadonlyArray<{
  template: string;
  description: string;
}> = [
  { template: 'Projects/{{tag.project}}', description: 'Value of a tag' },
  {
    template: 'Tasks/{{property.status}}',
    description: 'Value of a property',
  },
  {
    template: 'Archive/{{property.created.year}}',
    description: 'Date component of a property',
  },
  {
    template: 'Journal/{{property.created.YYYY-MM-DD}}',
    description: 'Formatted date of a property',
  },
];

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  return trigger.criteriaType === 'tag' ? '#tag' : 'Value';
}

export function attachValueSuggester(
  app: App,
  input: HTMLInputElement,
  trigger: Trigger,
  vaultIndexCache?: PluginVaultIndexCache
): void {
  if (trigger.criteriaType === 'tag') {
    new TagSuggest(app, input, vaultIndexCache);
  } else if (trigger.criteriaType === 'folder') {
    new FolderSuggest(app, input);
  } else if (
    trigger.criteriaType === 'properties' &&
    trigger.propertyName &&
    trigger.propertyType
  ) {
    new PropertyValueSuggest(
      app,
      input,
      trigger.propertyName,
      trigger.propertyType,
      vaultIndexCache
    );
  }
}

export function removeTrigger(triggers: Trigger[], index: number): void {
  triggers.splice(index, 1);
  if (triggers.length === 0) {
    triggers.push(createDefaultTrigger());
  }
}

/** Moves a trigger so that it ends up at `toIndex` in the resulting array. */
export function moveTrigger(
  triggers: Trigger[],
  fromIndex: number,
  toIndex: number
): void {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= triggers.length ||
    toIndex >= triggers.length
  ) {
    return;
  }
  const [moved] = triggers.splice(fromIndex, 1);
  triggers.splice(toIndex, 0, moved);
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

/** @returns an error message, or null when the rule is valid */
export function validateRule(rule: RuleV2): string | null {
  if (!rule.name || rule.name.trim() === '') {
    return 'Rule name cannot be empty.';
  }

  if (!rule.destination || rule.destination.trim() === '') {
    return 'Destination folder cannot be empty.';
  }

  if (rule.triggers.length === 0) {
    return 'At least one condition is required.';
  }

  for (let i = 0; i < rule.triggers.length; i++) {
    const trigger = rule.triggers[i];
    if (!operatorRequiresValue(trigger.operator)) {
      continue;
    }
    if (!trigger.value || trigger.value.trim() === '') {
      return `Condition ${i + 1}: Value cannot be empty.`;
    }
    if (isRegexOperator(trigger.operator)) {
      try {
        new RegExp(trigger.value);
      } catch (e) {
        return `Condition ${i + 1}: Invalid regex pattern: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }
  }

  return null;
}
