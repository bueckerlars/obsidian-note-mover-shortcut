import { Rule } from '../types/Rule';
import {
  RuleV2,
  Trigger,
  CriteriaType,
  Operator,
  TextOperator,
} from '../types/RuleV2';
import { getDefaultOperatorForCriteriaType } from '../utils/OperatorMapping';

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
      return null;
    }

    // Parse V1 criteria string: "type: value"
    const match = ruleV1.criteria.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!match) {
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

    // Create RuleV2 with single trigger and aggregation "all"
    return {
      name: this.generateRuleName(type, value, index),
      destination: ruleV1.path,
      aggregation: 'all',
      triggers: [triggerMapping],
      active: true,
    };
  }

  /**
   * Maps V1 criteria type and value to V2 Trigger
   * @param type - V1 criteria type
   * @param value - V1 criteria value
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
        operator = 'date is'; // More appropriate for date criteria
        break;
      case 'updated_at':
        criteriaType = 'modified_at';
        operator = 'date is'; // More appropriate for date criteria
        break;
      case 'property':
        criteriaType = 'properties';
        operator = 'has any value'; // Default for property existence check
        break;
      default:
        return null;
    }

    const trigger: Trigger = {
      criteriaType,
      operator,
      value,
    };

    // Add property-specific fields for properties criteria
    if (criteriaType === 'properties') {
      // Try to extract property name from V1 format
      const colonIndex = value.indexOf(':');
      if (colonIndex !== -1) {
        trigger.propertyName = value.substring(0, colonIndex).trim();
        trigger.value = value.substring(colonIndex + 1).trim();
        trigger.propertyType = 'text'; // Default to text type
        trigger.operator = 'contains'; // Change to text-based operator for value matching
      } else {
        // No colon found, treat as property existence check
        trigger.propertyName = value;
        trigger.value = '';
        trigger.propertyType = 'text';
        trigger.operator = 'has any value';
      }
    }

    return trigger;
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
