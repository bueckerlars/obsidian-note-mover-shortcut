import { Rule } from '../types/Rule';
import {
  RuleV2,
  Trigger,
  CriteriaType,
  Operator,
  TextOperator,
} from '../types/RuleV2';
import {
  getDefaultOperatorForCriteriaType,
  isOperatorValidForCriteriaType,
  isOperatorValidForPropertyType,
  operatorRequiresValue,
} from '../utils/OperatorMapping';

/**
 * Service for migrating Rule V1 to Rule V2 format
 */
export class RuleMigrationService {
  /**
   * Migrates an array of Rule V1 objects to RuleV2 format
   * @param rulesV1 - Array of V1 rules to migrate
   * @returns Array of RuleV2 objects
   */
  public static migrateRules(rulesV1: Rule[]): RuleV2[] {
    if (!Array.isArray(rulesV1) || rulesV1.length === 0) {
      return [];
    }

    return rulesV1
      .map((ruleV1, index) => this.migrateRule(ruleV1, index))
      .filter((rule): rule is RuleV2 => rule !== null);
  }

  /**
   * Migrates a single Rule V1 to RuleV2 format
   * Creates a single-trigger rule with aggregation "all"
   * @param ruleV1 - V1 rule to migrate
   * @param index - Rule index for naming
   * @returns RuleV2 object or null if migration fails
   */
  private static migrateRule(ruleV1: Rule, index: number): RuleV2 | null {
    if (!ruleV1 || !ruleV1.criteria || !ruleV1.path) {
      console.warn(
        `[RuleMigration] Rule ${index + 1}: Skipping invalid rule (missing criteria or path)`
      );
      return null;
    }

    // Parse V1 criteria string: "type: value"
    const match = ruleV1.criteria.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!match) {
      console.warn(
        `[RuleMigration] Rule ${index + 1}: Invalid criteria format: "${ruleV1.criteria}"`
      );
      // Invalid format - create disabled rule with original criteria as name
      return {
        name: `Rule ${index + 1} (Invalid format)`,
        destination: ruleV1.path || '',
        aggregation: 'all',
        triggers: [
          {
            criteriaType: 'tag',
            operator: 'includes item',
            value: '',
          },
        ],
        active: false,
      };
    }

    const type = match[1];
    const value = match[2];

    // Map V1 type to V2 CriteriaType and RuleType
    const triggerMapping = this.mapV1ToV2Trigger(type, value);

    if (!triggerMapping) {
      console.warn(
        `[RuleMigration] Rule ${index + 1}: Unsupported criteria type: "${type}"`
      );
      // Unsupported type - create disabled rule with hint
      return {
        name: `Rule ${index + 1} (Unsupported: ${type})`,
        destination: ruleV1.path,
        aggregation: 'all',
        triggers: [
          {
            criteriaType: 'tag',
            operator: 'includes item',
            value: '',
          },
        ],
        active: false,
      };
    }

    // Validate the migrated trigger
    // For properties with propertyType, validate against propertyType instead of criteriaType
    let isValidOperator = false;
    if (
      triggerMapping.criteriaType === 'properties' &&
      triggerMapping.propertyType
    ) {
      // For properties, validate against propertyType
      isValidOperator = isOperatorValidForPropertyType(
        triggerMapping.operator,
        triggerMapping.propertyType
      );
      if (!isValidOperator) {
        console.error(
          `[RuleMigration] Rule ${index + 1}: Invalid operator "${triggerMapping.operator}" for propertyType "${triggerMapping.propertyType}"`
        );
      }
    } else {
      // For other criteria types, validate against criteriaType
      isValidOperator = isOperatorValidForCriteriaType(
        triggerMapping.operator,
        triggerMapping.criteriaType
      );
      if (!isValidOperator) {
        console.error(
          `[RuleMigration] Rule ${index + 1}: Invalid operator "${triggerMapping.operator}" for criteriaType "${triggerMapping.criteriaType}"`
        );
      }
    }

    if (!isValidOperator) {
      // Create disabled rule with validation error
      return {
        name: `Rule ${index + 1} (Invalid operator)`,
        destination: ruleV1.path,
        aggregation: 'all',
        triggers: [triggerMapping],
        active: false,
      };
    }

    // Check if operator requires value and value is empty
    if (
      operatorRequiresValue(triggerMapping.operator) &&
      (!triggerMapping.value || triggerMapping.value.trim() === '')
    ) {
      console.warn(
        `[RuleMigration] Rule ${index + 1}: Operator "${triggerMapping.operator}" requires a value but value is empty. Rule will be disabled.`
      );
      // Create disabled rule with empty value warning
      return {
        name: this.generateRuleName(type, value, index),
        destination: ruleV1.path,
        aggregation: 'all',
        triggers: [triggerMapping],
        active: false,
      };
    }

    // Create RuleV2 with single trigger and aggregation "all"
    const migratedRule: RuleV2 = {
      name: this.generateRuleName(type, value, index),
      destination: ruleV1.path,
      aggregation: 'all',
      triggers: [triggerMapping],
      active: true,
    };

    console.log(
      `[RuleMigration] Rule ${index + 1}: Successfully migrated "${ruleV1.criteria}" -> "${migratedRule.name}"`
    );

    return migratedRule;
  }

  /**
   * Maps V1 criteria type and value to V2 Trigger
   * @param type - V1 criteria type
   * @param value - V1 criteria value (already extracted from "type: value" format)
   * @returns Trigger object or null if not mappable
   */
  private static mapV1ToV2Trigger(type: string, value: string): Trigger | null {
    let criteriaType: CriteriaType;
    let operator: Operator;

    switch (type) {
      case 'tag':
        criteriaType = 'tag';
        operator = 'includes item'; // More appropriate for list-based criteria
        break;
      case 'fileName':
        criteriaType = 'fileName';
        operator = 'contains';
        break;
      case 'path':
        criteriaType = 'folder';
        operator = 'starts with';
        break;
      case 'content':
        // V1 "content" is not directly supported in V2
        // We could use "headings" as approximation or mark as unsupported
        return null;
      case 'created_at':
        criteriaType = 'created_at';
        // Use default operator 'is' for date criteria
        // This matches ISO date strings (e.g., "2024-01-01")
        operator = getDefaultOperatorForCriteriaType('created_at');
        break;
      case 'updated_at':
        criteriaType = 'modified_at';
        // Use default operator 'is' for date criteria
        operator = getDefaultOperatorForCriteriaType('modified_at');
        break;
      case 'property':
        criteriaType = 'properties';
        operator = 'has any value'; // Default for property existence check
        break;
      default:
        return null;
    }

    // Preserve important whitespace and leading characters (e.g., # for tags)
    // Only trim trailing whitespace, not leading
    const processedValue = this.processValue(value, criteriaType);

    const trigger: Trigger = {
      criteriaType,
      operator,
      value: processedValue,
    };

    // Add property-specific fields for properties criteria
    if (criteriaType === 'properties') {
      // V1 format: "property: key" or "property: key:value"
      // The value parameter here is already "key" or "key:value"
      const colonIndex = processedValue.indexOf(':');
      if (colonIndex !== -1) {
        // Format: "key:value" - extract property name and value
        trigger.propertyName = processedValue.substring(0, colonIndex).trim();
        const propertyValue = processedValue.substring(colonIndex + 1).trim();
        trigger.value = propertyValue;
        trigger.propertyType = 'text'; // Default to text type
        trigger.operator = 'contains'; // Change to text-based operator for value matching
      } else {
        // Format: "key" - property existence check
        trigger.propertyName = processedValue.trim();
        trigger.value = '';
        trigger.propertyType = 'text';
        trigger.operator = 'has any value';
      }
    }

    return trigger;
  }

  /**
   * Processes value string, preserving important leading characters
   * @param value - Raw value string
   * @param criteriaType - The criteria type to determine processing rules
   * @returns Processed value string
   */
  private static processValue(
    value: string,
    criteriaType: CriteriaType
  ): string {
    if (!value) {
      return '';
    }

    // For tags, preserve leading # and only trim trailing whitespace
    if (criteriaType === 'tag') {
      // Remove leading whitespace but preserve # if present
      const trimmed = value.trimStart();
      // Only trim trailing whitespace
      return trimmed.trimEnd();
    }

    // For other types, trim both ends but preserve internal whitespace
    return value.trim();
  }

  /**
   * Generates a descriptive name for the migrated rule
   * @param type - V1 criteria type
   * @param value - V1 criteria value
   * @param index - Rule index
   * @returns Generated rule name
   */
  private static generateRuleName(
    type: string,
    value: string,
    index: number
  ): string {
    const truncatedValue =
      value.length > 30 ? value.substring(0, 30) + '...' : value;

    switch (type) {
      case 'tag':
        return `Tag: ${truncatedValue}`;
      case 'fileName':
        return `Filename: ${truncatedValue}`;
      case 'path':
        return `Folder: ${truncatedValue}`;
      case 'created_at':
        return `Created: ${truncatedValue}`;
      case 'updated_at':
        return `Modified: ${truncatedValue}`;
      case 'property':
        return `Property: ${truncatedValue}`;
      default:
        return `Rule ${index + 1}`;
    }
  }

  /**
   * Checks if migration is needed (V1 rules exist, but no V2 rules)
   * @param rulesV1 - V1 rules array
   * @param rulesV2 - V2 rules array
   * @returns true if migration should be performed
   */
  public static shouldMigrate(rulesV1: Rule[], rulesV2?: RuleV2[]): boolean {
    // Migrate if V1 has rules and V2 is empty or undefined
    return (
      Array.isArray(rulesV1) &&
      rulesV1.length > 0 &&
      (!rulesV2 || rulesV2.length === 0)
    );
  }

  /**
   * Migrates RuleV2 triggers from old format (ruleType) to new format (operator)
   * This handles legacy data that uses "ruleType" instead of "operator"
   * @param rulesV2 - Array of RuleV2 objects to migrate
   * @returns True if any migration was performed
   */
  public static migrateRuleV2Triggers(rulesV2: RuleV2[]): boolean {
    if (!Array.isArray(rulesV2)) {
      return false;
    }

    let migrated = false;

    for (const rule of rulesV2) {
      if (!rule.triggers || !Array.isArray(rule.triggers)) {
        continue;
      }

      for (const trigger of rule.triggers) {
        // Check if trigger has ruleType instead of operator (legacy format)
        if ((trigger as any).ruleType && !trigger.operator) {
          const ruleType = (trigger as any).ruleType;

          // Map ruleType to operator based on criteriaType
          const operator = this.mapRuleTypeToOperator(
            ruleType,
            trigger.criteriaType
          );

          if (operator) {
            trigger.operator = operator;
            delete (trigger as any).ruleType;
            migrated = true;
          }
        }
      }
    }

    return migrated;
  }

  /**
   * Safely converts a value to a string for processing
   * Handles cases where value might be a number, boolean, object, etc. from corrupted data
   * @param value - Value to convert (can be any type)
   * @returns String representation of the value, or empty string for null/undefined
   */
  private static ensureStringValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    // Convert other types to string (number, boolean, object, etc.)
    return String(value);
  }

  /**
   * Repairs RuleV2 rules with invalid or missing property fields
   * This fixes issues like properties criteria without propertyName
   * @param rulesV2 - Array of RuleV2 objects to repair
   * @returns True if any repair was performed
   */
  public static repairRuleV2Properties(rulesV2: RuleV2[]): boolean {
    if (!Array.isArray(rulesV2)) {
      return false;
    }

    let repaired = false;

    for (let ruleIndex = 0; ruleIndex < rulesV2.length; ruleIndex++) {
      const rule = rulesV2[ruleIndex];
      if (!rule.triggers || !Array.isArray(rule.triggers)) {
        continue;
      }

      for (
        let triggerIndex = 0;
        triggerIndex < rule.triggers.length;
        triggerIndex++
      ) {
        const trigger = rule.triggers[triggerIndex];

        // Safely convert value to string before processing
        const valueStr = this.ensureStringValue(trigger.value);
        trigger.value = valueStr;

        // Check if this is a properties trigger without propertyName
        if (trigger.criteriaType === 'properties' && !trigger.propertyName) {
          console.warn(
            `[RuleMigration] Repairing RuleV2[${ruleIndex}].triggers[${triggerIndex}]: Missing propertyName for properties criteria`
          );

          // Try to extract propertyName from value if value exists and looks like a property name
          if (valueStr && valueStr.trim() !== '') {
            // Check if value contains a colon (key:value format)
            const colonIndex = valueStr.indexOf(':');
            if (colonIndex !== -1) {
              // Extract property name from "key:value" format
              trigger.propertyName = valueStr.substring(0, colonIndex).trim();
              trigger.value = valueStr.substring(colonIndex + 1).trim();
              trigger.propertyType = trigger.propertyType || 'text';
              // Ensure operator is valid for property type
              if (
                !isOperatorValidForPropertyType(
                  trigger.operator,
                  trigger.propertyType
                )
              ) {
                trigger.operator = 'contains';
              }
            } else {
              // Value is just the property name
              trigger.propertyName = valueStr.trim();
              trigger.value = '';
              trigger.propertyType = trigger.propertyType || 'text';
              trigger.operator = 'has any value';
            }
            repaired = true;
          } else {
            // No value to extract from, disable the rule
            console.error(
              `[RuleMigration] RuleV2[${ruleIndex}].triggers[${triggerIndex}]: Cannot repair properties trigger without value. Disabling rule.`
            );
            rule.active = false;
            repaired = true;
          }
        }

        // Also check if propertyName is empty string and fix it
        if (
          trigger.criteriaType === 'properties' &&
          trigger.propertyName === ''
        ) {
          console.warn(
            `[RuleMigration] Repairing RuleV2[${ruleIndex}].triggers[${triggerIndex}]: Empty propertyName for properties criteria`
          );

          if (valueStr && valueStr.trim() !== '') {
            const colonIndex = valueStr.indexOf(':');
            if (colonIndex !== -1) {
              // Extract property name from "key:value" format
              trigger.propertyName = valueStr.substring(0, colonIndex).trim();
              trigger.value = valueStr.substring(colonIndex + 1).trim();
              trigger.propertyType = trigger.propertyType || 'text';
              // Ensure operator is valid for property type
              if (
                !isOperatorValidForPropertyType(
                  trigger.operator,
                  trigger.propertyType
                )
              ) {
                trigger.operator = 'contains';
              }
            } else {
              trigger.propertyName = valueStr.trim();
              trigger.value = '';
              trigger.operator = 'has any value';
            }
            trigger.propertyType = trigger.propertyType || 'text';
            repaired = true;
          } else {
            console.error(
              `[RuleMigration] RuleV2[${ruleIndex}].triggers[${triggerIndex}]: Cannot repair properties trigger with empty propertyName and value. Disabling rule.`
            );
            rule.active = false;
            repaired = true;
          }
        }
      }
    }

    return repaired;
  }

  /**
   * Maps legacy ruleType values to operator values
   * @param ruleType - Legacy ruleType value (e.g., "contains")
   * @param criteriaType - The criteria type to help determine correct operator
   * @returns Correct operator value or null if mapping not possible
   */
  private static mapRuleTypeToOperator(
    ruleType: string,
    criteriaType: CriteriaType
  ): Operator | null {
    // For tag/list-based criteria types, "contains" maps to "includes item"
    if (
      criteriaType === 'tag' ||
      criteriaType === 'links' ||
      criteriaType === 'embeds'
    ) {
      switch (ruleType) {
        case 'contains':
          return 'includes item';
        case 'does not contain':
          return 'does not include item';
        default:
          // Try to find a matching operator by name
          return this.findMatchingOperator(ruleType, criteriaType);
      }
    }

    // For text-based criteria types, try direct mapping or find matching operator
    if (
      criteriaType === 'fileName' ||
      criteriaType === 'folder' ||
      criteriaType === 'extension' ||
      criteriaType === 'headings'
    ) {
      // Direct mapping for common text operators
      const textOperatorMap: Record<string, TextOperator> = {
        contains: 'contains',
        'does not contain': 'does not contain',
        'starts with': 'starts with',
        'ends with': 'ends with',
        is: 'is',
        'is not': 'is not',
      };

      if (textOperatorMap[ruleType]) {
        return textOperatorMap[ruleType];
      }

      return this.findMatchingOperator(ruleType, criteriaType);
    }

    // For properties, use default mapping
    if (criteriaType === 'properties') {
      if (ruleType === 'contains') {
        return 'contains';
      }
      return 'has any value'; // Default fallback
    }

    // For dates, try to find matching operator
    if (criteriaType === 'created_at' || criteriaType === 'modified_at') {
      return this.findMatchingOperator(ruleType, criteriaType);
    }

    // Fallback: try to find matching operator
    return this.findMatchingOperator(ruleType, criteriaType);
  }

  /**
   * Finds a matching operator for a ruleType by checking if it exists in valid operators
   * @param ruleType - Legacy ruleType value
   * @param criteriaType - The criteria type
   * @returns Matching operator or default operator for criteria type
   */
  private static findMatchingOperator(
    ruleType: string,
    criteriaType: CriteriaType
  ): Operator {
    // Get default operator as fallback
    const defaultOperator = getDefaultOperatorForCriteriaType(criteriaType);

    // List of all possible operators to check
    const allOperators: Operator[] = [
      // Text operators
      'is',
      'is not',
      'contains',
      'does not contain',
      'starts with',
      'does not starts with',
      'ends with',
      'does not ends with',
      'match regex',
      'does not match regex',
      // List operators
      'includes item',
      'does not include item',
      'all are',
      'all start with',
      'all end with',
      'all match regex',
      'any contain',
      'any end with',
      'any match regex',
      'none contain',
      'none start with',
      'none end with',
      'count is',
      'count is not',
      'count is less than',
      'count is more than',
      // Date operators
      'date is',
      'date is not',
      'date is today',
      'date is not today',
      'date is before',
      'date is after',
      'is before',
      'is after',
      // Property operators
      'has any value',
      'has no value',
      'property is present',
      'property is missing',
      'equals',
      'does not equal',
      'is less than',
      'is more than',
    ];

    // Check if ruleType matches any operator (case-insensitive)
    const matchingOperator = allOperators.find(
      op => op.toLowerCase() === ruleType.toLowerCase()
    );

    return matchingOperator || defaultOperator;
  }
}
