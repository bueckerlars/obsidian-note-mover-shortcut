import { NoteMoverShortcutSettings } from '../settings/Settings';
import { HistoryEntry, BulkOperation } from '../types/HistoryEntry';
import { PluginData } from '../types/PluginData';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

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
}
