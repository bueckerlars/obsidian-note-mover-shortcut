import { PluginData } from '../types/PluginData';
import { CriteriaType, Operator } from '../types/RuleV2';
import { validateDestinationTemplate } from '../domain/templates/DestinationTemplate';
import {
  getOperatorsForCriteriaType,
  getOperatorsForPropertyType,
  isOperatorValidForCriteriaType,
  isOperatorValidForPropertyType,
  isRegexOperator,
  operatorRequiresValue,
} from './OperatorMapping';
import { stringifyUnknown } from './stringify-unknown';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export class SettingsValidator {
  /**
   * Validates a complete settings object
   */
  static validateSettings(settings: unknown): ValidationResult {
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
      return this.validatePluginData(settings);
    }

    // Flat legacy JSON (pre–PluginData export shape)
    return this.validateLegacySettings(settings);
  }

  /**
   * Quick shape check for new PluginData export/import format
   */
  private static looksLikePluginData(
    value: unknown
  ): value is PluginData | { settings: unknown } {
    if (!value || typeof value !== 'object') return false;
    if (
      'settings' in value &&
      value.settings &&
      typeof value.settings === 'object'
    ) {
      // ensure at least one of the new sub-keys exists
      const s = value.settings as Record<string, unknown>;
      return (
        (typeof s.triggers === 'object' && s.triggers !== null) ||
        (typeof s.filters === 'object' && s.filters !== null) ||
        Array.isArray(s.rulesV2)
      );
    }
    return false;
  }

  /**
   * Validate flat legacy settings JSON (historical export format without nested `settings`).
   */
  private static validateLegacySettings(settings: unknown): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!isRecord(settings)) {
      result.errors.push('Settings must be a valid object');
      result.isValid = false;
      return result;
    }

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
  private static validatePluginData(data: unknown): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!isRecord(data)) {
      result.errors.push('Settings must be a valid object');
      result.isValid = false;
      return result;
    }

    const settings = data.settings;
    if (!isRecord(settings)) {
      result.errors.push('Field "settings" is required and must be an object');
      result.isValid = false;
      return result;
    }

    // triggers
    if (!isRecord(settings.triggers)) {
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
    if (!isRecord(settings.filters)) {
      result.errors.push(
        'Field "settings.filters" is required and must be an object'
      );
      result.isValid = false;
    } else {
      const f = settings.filters as { filter?: unknown[] };
      if (!Array.isArray(f.filter)) {
        result.errors.push('Field "settings.filters.filter" must be an array');
        result.isValid = false;
      } else {
        for (let i = 0; i < f.filter.length; i++) {
          const item = f.filter[i];
          if (!isRecord(item) || typeof item.value !== 'string') {
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
        !isRecord(rp) ||
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
    value: unknown,
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
    value: unknown,
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
    value: unknown,
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
    value: unknown,
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
    value: unknown,
    result: ValidationResult
  ): boolean {
    if (value === undefined || value === null) {
      return true;
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
    rule: unknown,
    index: number,
    result: ValidationResult
  ): boolean {
    if (!isRecord(rule)) {
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
    value: unknown,
    result: ValidationResult
  ): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      const entry: unknown = value[i];
      if (!isRecord(entry)) {
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
    value: unknown,
    result: ValidationResult
  ): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      const operation: unknown = value[i];
      if (!isRecord(operation)) {
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
  static sanitizeSettings(settings: unknown): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    if (!isRecord(settings)) {
      return sanitized;
    }

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
  static validateRulesV2Array(
    rulesV2: unknown,
    result: ValidationResult
  ): boolean {
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
    rule: unknown,
    index: number,
    result: ValidationResult
  ): boolean {
    if (!isRecord(rule)) {
      result.errors.push(`RuleV2 at index ${index} must be an object`);
      return false;
    }

    // Validate name
    if (
      !this.validateStringField(rule.name, `rulesV2[${index}].name`, result)
    ) {
      return false;
    }

    // Validate destination (required string)
    if (
      !this.validateStringField(
        rule.destination,
        `rulesV2[${index}].destination`,
        result
      )
    ) {
      return false;
    }

    // Validate destination template syntax (lenient: only syntax, no semantics)
    const templateValidation = validateDestinationTemplate(
      String(rule.destination)
    );
    if (!templateValidation.isValid) {
      for (const error of templateValidation.errors) {
        result.errors.push(`rulesV2[${index}].destination: ${error}`);
      }
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
    trigger: unknown,
    ruleIndex: number,
    triggerIndex: number,
    result: ValidationResult
  ): boolean {
    const path = `rulesV2[${ruleIndex}].triggers[${triggerIndex}]`;

    if (!isRecord(trigger)) {
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
    if (!validCriteriaTypes.includes(trigger.criteriaType as CriteriaType)) {
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

      // PropertyType is optional — detected automatically
      // If present, it must be valid
      if (trigger.propertyType) {
        const validPropertyTypes = [
          'text',
          'number',
          'checkbox',
          'date',
          'list',
        ];
        if (
          !validPropertyTypes.includes(stringifyUnknown(trigger.propertyType))
        ) {
          result.errors.push(
            `${path}.propertyType must be one of: ${validPropertyTypes.join(', ')}`
          );
          return false;
        }
      }

      // Validate operator against property type (if known), otherwise base property operators
      if (trigger.propertyType) {
        if (
          !isOperatorValidForPropertyType(
            trigger.operator as Operator,
            stringifyUnknown(trigger.propertyType)
          )
        ) {
          const validOperators = getOperatorsForPropertyType(
            stringifyUnknown(trigger.propertyType)
          );
          result.errors.push(
            `${path}.operator '${String(trigger.operator)}' is not valid for propertyType '${stringifyUnknown(trigger.propertyType)}'. Valid operators: ${validOperators.join(', ')}`
          );
          return false;
        }
      } else {
        const propertyTypes = ['text', 'number', 'checkbox', 'date', 'list'];
        const isValidForAnyPropertyType = propertyTypes.some(propertyType =>
          isOperatorValidForPropertyType(
            trigger.operator as Operator,
            propertyType
          )
        );
        if (!isValidForAnyPropertyType) {
          const validOperators = Array.from(
            new Set(
              propertyTypes.flatMap(propertyType =>
                getOperatorsForPropertyType(propertyType)
              )
            )
          );
          result.errors.push(
            `${path}.operator '${trigger.operator}' is not valid for criteriaType '${trigger.criteriaType}'. Valid operators: ${validOperators.join(', ')}`
          );
          return false;
        }
      }
    } else {
      // Check if operator is valid for the criteria type
      if (
        !isOperatorValidForCriteriaType(
          trigger.operator as Operator,
          trigger.criteriaType as CriteriaType
        )
      ) {
        const validOperators = getOperatorsForCriteriaType(
          trigger.criteriaType as CriteriaType
        );
        result.errors.push(
          `${path}.operator '${trigger.operator}' is not valid for criteriaType '${trigger.criteriaType}'. Valid operators: ${validOperators.join(', ')}`
        );
        return false;
      }
    }

    // Validate value (only when operator requires a value)
    if (operatorRequiresValue(trigger.operator as Operator)) {
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
    rule: unknown,
    index: number,
    result: ValidationResult
  ): void {
    if (!isRecord(rule) || !Array.isArray(rule.triggers)) {
      return;
    }

    let hasInvalidRegex = false;

    for (let j = 0; j < rule.triggers.length; j++) {
      const trigger: unknown = rule.triggers[j];
      if (!isRecord(trigger)) {
        continue;
      }
      if (isRegexOperator(trigger.operator as Operator)) {
        try {
          // Try to compile the regex
          new RegExp(stringifyUnknown(trigger.value));
        } catch (error) {
          hasInvalidRegex = true;
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(
            `RuleV2 at index ${index}, trigger ${j}: Invalid regex pattern '${stringifyUnknown(trigger.value)}': ${errorMsg}`
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
