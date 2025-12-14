import { NoteMoverShortcutSettings } from '../settings/Settings';
import { HistoryEntry, BulkOperation } from '../types/HistoryEntry';
import { PluginData } from '../types/PluginData';
import { RuleV2, Trigger, CriteriaType, Operator } from '../types/RuleV2';
import {
  getOperatorsForCriteriaType,
  getOperatorsForPropertyType,
  isOperatorValidForCriteriaType,
  isOperatorValidForPropertyType,
  isRegexOperator,
  operatorRequiresValue,
} from './OperatorMapping';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * @deprecated Use RuleV2 from '../types/RuleV2' instead. This will be removed in a future version.
 */
export interface Rule {
  criteria: string;
  path: string;
}

export class SettingsValidator {
  /**
   * Validates a complete settings object
   */
  static validateSettings(settings: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check if settings is an object
    if (!settings || typeof settings !== 'object') {
      result.errors.push('Settings must be a valid object');
      result.isValid = false;
      return result;
    }

    // Detect and validate by shape
    if (this.looksLikePluginData(settings)) {
      return this.validatePluginData(settings as PluginData);
    }

    // Otherwise treat as legacy NoteMoverShortcutSettings
    return this.validateLegacySettings(settings);
  }

  /**
   * Quick shape check for new PluginData export/import format
   */
  private static looksLikePluginData(
    value: any
  ): value is PluginData | { settings: any } {
    if (!value || typeof value !== 'object') return false;
    if (
      'settings' in value &&
      value.settings &&
      typeof value.settings === 'object'
    ) {
      // ensure at least one of the new sub-keys exists
      const s = value.settings;
      return (
        ('triggers' in s && typeof s.triggers === 'object') ||
        ('filters' in s && typeof s.filters === 'object') ||
        Array.isArray(s.rules)
      );
    }
    return false;
  }

  /**
   * Validate legacy NoteMoverShortcutSettings
   */
  private static validateLegacySettings(settings: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Legacy required string fields no longer exist; treat them as optional if present
    const legacyOptionalStringFields = ['destination', 'inboxLocation'];
    for (const field of legacyOptionalStringFields) {
      if (!this.validateStringField(settings[field], field, result, false)) {
        result.isValid = false;
      }
    }

    // Validate boolean fields
    // Validate boolean fields (legacy names may be absent)
    const booleanFieldsOptional = [
      'enablePeriodicMovement',
      'enableOnEditTrigger',
      'enableFilter',
      'enableRules',
    ];
    for (const field of booleanFieldsOptional) {
      if (!this.validateBooleanField(settings[field], field, result, false)) {
        result.isValid = false;
      }
    }

    // Validate periodicMovementInterval
    if (
      settings.periodicMovementInterval !== undefined &&
      settings.periodicMovementInterval !== null &&
      !this.validateIntervalField(settings.periodicMovementInterval, result)
    ) {
      result.isValid = false;
    }

    // Validate filter array
    if (
      settings.filter !== undefined &&
      settings.filter !== null &&
      !this.validateFilterArray(settings.filter, result)
    ) {
      result.isValid = false;
    }

    // Validate rules array
    if (
      settings.rules !== undefined &&
      settings.rules !== null &&
      !this.validateRulesArray(settings.rules, result)
    ) {
      result.isValid = false;
    }

    // Optional arrays
    if (settings.history !== undefined) {
      if (!this.validateHistoryArray(settings.history, result)) {
        result.warnings.push('History data is invalid and will be ignored');
      }
    }
    if (settings.bulkOperations !== undefined) {
      if (!this.validateBulkOperationsArray(settings.bulkOperations, result)) {
        result.warnings.push(
          'Bulk operations data is invalid and will be ignored'
        );
      }
    }

    // Optional lastSeenVersion
    if (settings.lastSeenVersion !== undefined) {
      if (
        !this.validateStringField(
          settings.lastSeenVersion,
          'lastSeenVersion',
          result,
          false
        )
      ) {
        result.warnings.push(
          'Last seen version is invalid and will be ignored'
        );
      }
    }

    return result;
  }

  /**
   * Validate new PluginData import/export shape
   */
  private static validatePluginData(data: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const settings = data.settings;
    if (!settings || typeof settings !== 'object') {
      result.errors.push('Field "settings" is required and must be an object');
      result.isValid = false;
      return result;
    }

    // triggers
    if (!settings.triggers || typeof settings.triggers !== 'object') {
      result.errors.push(
        'Field "settings.triggers" is required and must be an object'
      );
      result.isValid = false;
    } else {
      const t = settings.triggers;
      if (
        !this.validateBooleanField(
          t.enablePeriodicMovement,
          'settings.triggers.enablePeriodicMovement',
          result
        )
      ) {
        result.isValid = false;
      }
      if (!this.validateIntervalField(t.periodicMovementInterval, result)) {
        result.isValid = false;
      }
      if (
        !this.validateBooleanField(
          t.enableOnEditTrigger,
          'settings.triggers.enableOnEditTrigger',
          result
        )
      ) {
        result.isValid = false;
      }
    }

    // filters
    if (!settings.filters || typeof settings.filters !== 'object') {
      result.errors.push(
        'Field "settings.filters" is required and must be an object'
      );
      result.isValid = false;
    } else {
      const f = settings.filters;
      if (!Array.isArray(f.filter)) {
        result.errors.push('Field "settings.filters.filter" must be an array');
        result.isValid = false;
      } else {
        for (let i = 0; i < f.filter.length; i++) {
          if (
            !f.filter[i] ||
            typeof f.filter[i] !== 'object' ||
            typeof f.filter[i].value !== 'string'
          ) {
            result.errors.push(
              `Filter item at index ${i} must be an object with string 'value'`
            );
            result.isValid = false;
            break;
          }
        }
      }
    }

    // rules
    if (!this.validateRulesArray(settings.rules, result)) {
      result.isValid = false;
    }

    // RuleV2 validation (in settings)
    if (settings.rulesV2 !== undefined) {
      if (!this.validateRulesV2Array(settings.rulesV2, result)) {
        result.isValid = false;
      }
    }

    // retention policy (optional but recommended)
    if (settings.retentionPolicy !== undefined) {
      const rp = settings.retentionPolicy;
      if (
        !rp ||
        typeof rp !== 'object' ||
        typeof rp.value !== 'number' ||
        (rp.unit !== 'days' && rp.unit !== 'weeks' && rp.unit !== 'months')
      ) {
        result.warnings.push('Retention policy is invalid and will be ignored');
      }
    }

    // lastSeenVersion optional at root
    if (data.lastSeenVersion !== undefined) {
      if (
        !this.validateStringField(
          data.lastSeenVersion,
          'lastSeenVersion',
          result,
          false
        )
      ) {
        result.warnings.push(
          'Last seen version is invalid and will be ignored'
        );
      }
    }

    return result;
  }

  /**
   * Validates a string field
   */
  private static validateStringField(
    value: any,
    fieldName: string,
    result: ValidationResult,
    required = true
  ): boolean {
    if (required && (value === undefined || value === null)) {
      result.errors.push(`Field '${fieldName}' is required`);
      return false;
    }

    if (value !== undefined && value !== null && typeof value !== 'string') {
      result.errors.push(`Field '${fieldName}' must be a string`);
      return false;
    }

    return true;
  }

  /**
   * Validates a boolean field
   */
  private static validateBooleanField(
    value: any,
    fieldName: string,
    result: ValidationResult,
    required = true
  ): boolean {
    if (required && (value === undefined || value === null)) {
      result.errors.push(`Field '${fieldName}' is required`);
      return false;
    }

    if (value !== undefined && value !== null && typeof value !== 'boolean') {
      result.errors.push(`Field '${fieldName}' must be a boolean`);
      return false;
    }

    return true;
  }

  /**
   * Validates the periodic movement interval
   */
  private static validateIntervalField(
    value: any,
    result: ValidationResult
  ): boolean {
    if (value === undefined || value === null) {
      result.errors.push('Field "periodicMovementInterval" is required');
      return false;
    }

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      result.errors.push('Field "periodicMovementInterval" must be an integer');
      return false;
    }

    if (value < 1) {
      result.errors.push(
        'Field "periodicMovementInterval" must be greater than 0'
      );
      return false;
    }

    return true;
  }

  /**
   * Validates the filter array
   */
  private static validateFilterArray(
    value: any,
    result: ValidationResult
  ): boolean {
    if (value === undefined || value === null) {
      result.errors.push('Field "filter" is required');
      return false;
    }

    if (!Array.isArray(value)) {
      result.errors.push('Field "filter" must be an array');
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      if (typeof value[i] !== 'string') {
        result.errors.push(`Filter item at index ${i} must be a string`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validates the rules array
   */
  private static validateRulesArray(
    value: any,
    result: ValidationResult
  ): boolean {
    if (value === undefined || value === null) {
      result.errors.push('Field "rules" is required');
      return false;
    }

    if (!Array.isArray(value)) {
      result.errors.push('Field "rules" must be an array');
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      if (!this.validateRule(value[i], i, result)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates a single rule
   */
  private static validateRule(
    rule: any,
    index: number,
    result: ValidationResult
  ): boolean {
    if (!rule || typeof rule !== 'object') {
      result.errors.push(`Rule at index ${index} must be an object`);
      return false;
    }

    if (
      !this.validateStringField(
        rule.criteria,
        `rules[${index}].criteria`,
        result
      )
    ) {
      return false;
    }

    if (!this.validateStringField(rule.path, `rules[${index}].path`, result)) {
      return false;
    }

    return true;
  }

  /**
   * Validates the history array (optional)
   */
  private static validateHistoryArray(
    value: any,
    result: ValidationResult
  ): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      const entry = value[i];
      if (!entry || typeof entry !== 'object') {
        return false;
      }

      // Check required fields for history entry
      if (
        typeof entry.id !== 'string' ||
        typeof entry.timestamp !== 'number' ||
        typeof entry.sourcePath !== 'string' ||
        typeof entry.destinationPath !== 'string'
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates the bulk operations array (optional)
   */
  private static validateBulkOperationsArray(
    value: any,
    result: ValidationResult
  ): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      const operation = value[i];
      if (!operation || typeof operation !== 'object') {
        return false;
      }

      // Check required fields for bulk operation
      if (
        typeof operation.id !== 'string' ||
        typeof operation.timestamp !== 'number' ||
        !Array.isArray(operation.entries)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Creates a clean settings object with only valid fields
   */
  static sanitizeSettings(settings: any): Partial<NoteMoverShortcutSettings> {
    const sanitized: any = {};

    // Copy valid fields
    const validFields = [
      'destination',
      'inboxLocation',
      'enablePeriodicMovement',
      'periodicMovementInterval',
      'enableFilter',
      'filter',
      'enableRules',
      'rules',
      'retentionPolicy',
      'lastSeenVersion',
    ];

    for (const field of validFields) {
      if (settings[field] !== undefined) {
        sanitized[field] = settings[field];
      }
    }

    // Only include history and bulkOperations if they are valid arrays
    if (Array.isArray(settings.history)) {
      sanitized.history = settings.history;
    }

    if (Array.isArray(settings.bulkOperations)) {
      sanitized.bulkOperations = settings.bulkOperations;
    }

    return sanitized;
  }

  /**
   * Validates RuleV2 array with regex pre-compilation
   * @param rulesV2 - Array of RuleV2 objects to validate
   * @param result - ValidationResult to accumulate errors/warnings
   * @returns true if validation passes, false otherwise
   */
  static validateRulesV2Array(rulesV2: any, result: ValidationResult): boolean {
    if (!rulesV2) {
      // rulesV2 is optional, so missing is OK
      return true;
    }

    if (!Array.isArray(rulesV2)) {
      result.errors.push('Field "rulesV2" must be an array');
      return false;
    }

    for (let i = 0; i < rulesV2.length; i++) {
      if (!this.validateRuleV2(rulesV2[i], i, result)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates a single RuleV2 object
   * @param rule - RuleV2 object to validate
   * @param index - Index in the array for error messages
   * @param result - ValidationResult to accumulate errors/warnings
   * @returns true if validation passes, false otherwise
   */
  private static validateRuleV2(
    rule: any,
    index: number,
    result: ValidationResult
  ): boolean {
    if (!rule || typeof rule !== 'object') {
      result.errors.push(`RuleV2 at index ${index} must be an object`);
      return false;
    }

    // Validate name
    if (
      !this.validateStringField(rule.name, `rulesV2[${index}].name`, result)
    ) {
      return false;
    }

    // Validate destination
    if (
      !this.validateStringField(
        rule.destination,
        `rulesV2[${index}].destination`,
        result
      )
    ) {
      return false;
    }

    // Validate aggregation
    if (!rule.aggregation || typeof rule.aggregation !== 'string') {
      result.errors.push(
        `RuleV2 at index ${index}: 'aggregation' is required and must be a string`
      );
      return false;
    }
    if (!['all', 'any', 'none'].includes(rule.aggregation)) {
      result.errors.push(
        `RuleV2 at index ${index}: 'aggregation' must be one of: 'all', 'any', 'none'`
      );
      return false;
    }

    // Validate active
    if (typeof rule.active !== 'boolean') {
      result.errors.push(
        `RuleV2 at index ${index}: 'active' is required and must be a boolean`
      );
      return false;
    }

    // Validate triggers array
    if (!Array.isArray(rule.triggers)) {
      result.errors.push(
        `RuleV2 at index ${index}: 'triggers' is required and must be an array`
      );
      return false;
    }

    // Triggers array must not be empty
    if (rule.triggers.length === 0) {
      result.errors.push(
        `RuleV2 at index ${index}: 'triggers' array cannot be empty`
      );
      return false;
    }

    // Validate each trigger
    for (let j = 0; j < rule.triggers.length; j++) {
      if (!this.validateTrigger(rule.triggers[j], index, j, result)) {
        return false;
      }
    }

    // Pre-compile regex patterns
    this.compileRegexInRuleV2(rule, index, result);

    return true;
  }

  /**
   * Validates a single Trigger object
   * @param trigger - Trigger object to validate
   * @param ruleIndex - Rule index for error messages
   * @param triggerIndex - Trigger index for error messages
   * @param result - ValidationResult to accumulate errors/warnings
   * @returns true if validation passes, false otherwise
   */
  private static validateTrigger(
    trigger: any,
    ruleIndex: number,
    triggerIndex: number,
    result: ValidationResult
  ): boolean {
    const path = `rulesV2[${ruleIndex}].triggers[${triggerIndex}]`;

    if (!trigger || typeof trigger !== 'object') {
      result.errors.push(`${path} must be an object`);
      return false;
    }

    // Validate criteriaType
    const validCriteriaTypes: CriteriaType[] = [
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
    if (!trigger.criteriaType || typeof trigger.criteriaType !== 'string') {
      result.errors.push(
        `${path}.criteriaType is required and must be a string`
      );
      return false;
    }
    if (!validCriteriaTypes.includes(trigger.criteriaType)) {
      result.errors.push(
        `${path}.criteriaType must be one of: ${validCriteriaTypes.join(', ')}`
      );
      return false;
    }

    // Validate operator (replaces ruleType)
    if (!trigger.operator || typeof trigger.operator !== 'string') {
      result.errors.push(`${path}.operator is required and must be a string`);
      return false;
    }

    // Special validation for properties criteria
    if (trigger.criteriaType === 'properties') {
      // Validate propertyName
      if (!trigger.propertyName || typeof trigger.propertyName !== 'string') {
        result.errors.push(
          `${path}.propertyName is required for properties criteria and must be a string`
        );
        return false;
      }

      // PropertyType ist optional - wird automatisch erkannt
      // Aber wenn vorhanden, muss es valide sein
      if (trigger.propertyType) {
        const validPropertyTypes = [
          'text',
          'number',
          'checkbox',
          'date',
          'list',
        ];
        if (!validPropertyTypes.includes(trigger.propertyType)) {
          result.errors.push(
            `${path}.propertyType must be one of: ${validPropertyTypes.join(', ')}`
          );
          return false;
        }
      }

      // Validate operator against property type if propertyType is set
      // Otherwise validate against criteriaType
      if (trigger.propertyType) {
        // If propertyType is set, validate against propertyType
        if (
          !isOperatorValidForPropertyType(
            trigger.operator,
            trigger.propertyType
          )
        ) {
          const validOperators = getOperatorsForPropertyType(
            trigger.propertyType
          );
          result.errors.push(
            `${path}.operator '${trigger.operator}' is not valid for propertyType '${trigger.propertyType}'. Valid operators: ${validOperators.join(', ')}`
          );
          return false;
        }
      } else {
        // If propertyType is not set, validate against criteriaType (base property operators only)
        if (
          !isOperatorValidForCriteriaType(
            trigger.operator,
            trigger.criteriaType
          )
        ) {
          const validOperators = getOperatorsForCriteriaType(
            trigger.criteriaType
          );
          result.errors.push(
            `${path}.operator '${trigger.operator}' is not valid for criteriaType '${trigger.criteriaType}'. Valid operators: ${validOperators.join(', ')}`
          );
          return false;
        }
      }
    } else {
      // For non-properties criteria, validate against criteriaType
      if (
        !isOperatorValidForCriteriaType(trigger.operator, trigger.criteriaType)
      ) {
        const validOperators = getOperatorsForCriteriaType(
          trigger.criteriaType
        );
        result.errors.push(
          `${path}.operator '${trigger.operator}' is not valid for criteriaType '${trigger.criteriaType}'. Valid operators: ${validOperators.join(', ')}`
        );
        return false;
      }
    }

    // Validate value (nur wenn Operator einen Wert benötigt)
    if (operatorRequiresValue(trigger.operator)) {
      if (!this.validateStringField(trigger.value, `${path}.value`, result)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Pre-compiles regex patterns in a RuleV2 and marks the rule inactive if regex is invalid
   * @param rule - RuleV2 object to check for regex patterns
   * @param index - Rule index for error messages
   * @param result - ValidationResult to accumulate errors/warnings
   */
  private static compileRegexInRuleV2(
    rule: any,
    index: number,
    result: ValidationResult
  ): void {
    let hasInvalidRegex = false;

    for (let j = 0; j < rule.triggers.length; j++) {
      const trigger = rule.triggers[j];
      if (isRegexOperator(trigger.operator)) {
        try {
          // Try to compile the regex
          new RegExp(trigger.value);
        } catch (error) {
          hasInvalidRegex = true;
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(
            `RuleV2 at index ${index}, trigger ${j}: Invalid regex pattern '${trigger.value}': ${errorMsg}`
          );
        }
      }
    }

    // If any regex is invalid, mark the rule as inactive
    if (hasInvalidRegex) {
      rule.active = false;
      result.warnings.push(
        `RuleV2 at index ${index} has been set to inactive due to invalid regex pattern(s)`
      );
    }
  }
}
