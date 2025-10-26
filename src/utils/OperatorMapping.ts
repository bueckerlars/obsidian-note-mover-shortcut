import {
  CriteriaType,
  Operator,
  TextOperator,
  ListOperator,
  DateOperator,
  BasePropertyOperator,
  TextPropertyOperator,
  NumberPropertyOperator,
  ListPropertyOperator,
  DatePropertyOperator,
  CheckboxPropertyOperator,
} from '../types/RuleV2';
import { App } from 'obsidian';

/**
 * Utility functions for mapping operators to criteria types and property types
 * Provides centralized logic for UI and validation components
 */

// Text-based operators
const TEXT_OPERATORS: TextOperator[] = [
  'is',
  'is not',
  'contains',
  'starts with',
  'ends with',
  'match regex',
  'does not contain',
  'does not starts with',
  'does not ends with',
  'does not match regex',
];

// List-based operators
const LIST_OPERATORS: ListOperator[] = [
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
];

// Date-based operators
const DATE_OPERATORS: DateOperator[] = [
  'is',
  'is before',
  'is after',
  'time is before',
  'time is after',
  'time is before now',
  'time is after now',
  'date is',
  'date is not',
  'date is before',
  'date is after',
  'date is today',
  'date is not today',
  'is under X days ago',
  'is over X days ago',
  'day of week is',
  'day of week is not',
  'day of week is before',
  'day of week is after',
  'day of month is',
  'day of month is not',
  'day of month is before',
  'day of month is after',
  'month is',
  'month is not',
  'month is before',
  'month is after',
  'year is',
  'year is not',
  'year is before',
  'year is after',
];

// Base property operators (available for all property types)
const BASE_PROPERTY_OPERATORS: BasePropertyOperator[] = [
  'has any value',
  'has no value',
  'property is present',
  'property is missing',
];

// Number property operators
const NUMBER_PROPERTY_OPERATORS: NumberPropertyOperator[] = [
  ...BASE_PROPERTY_OPERATORS,
  'equals',
  'does not equal',
  'is less than',
  'is more than',
  'is divisible by',
  'is not divisible by',
];

// Checkbox property operators
const CHECKBOX_PROPERTY_OPERATORS: CheckboxPropertyOperator[] = [
  ...BASE_PROPERTY_OPERATORS,
  'is true',
  'is false',
];

/**
 * Gets all operators available for a specific criteria type
 * @param criteriaType - The criteria type to get operators for
 * @returns Array of operators available for the criteria type
 */
export function getOperatorsForCriteriaType(
  criteriaType: CriteriaType
): Operator[] {
  switch (criteriaType) {
    case 'fileName':
    case 'folder':
    case 'extension':
    case 'headings':
      return TEXT_OPERATORS;

    case 'tag':
    case 'links':
    case 'embeds':
      return LIST_OPERATORS;

    case 'created_at':
    case 'modified_at':
      return DATE_OPERATORS;

    case 'properties':
      // For properties, we need to know the property type to determine operators
      // Return base property operators as default
      return BASE_PROPERTY_OPERATORS;

    default:
      return [];
  }
}

/**
 * Gets all operators available for a specific property type
 * @param propertyType - The property type (text, number, checkbox, date, list)
 * @returns Array of operators available for the property type
 */
export function getOperatorsForPropertyType(propertyType: string): Operator[] {
  switch (propertyType) {
    case 'text':
      return [...BASE_PROPERTY_OPERATORS, ...TEXT_OPERATORS];

    case 'number':
      return NUMBER_PROPERTY_OPERATORS;

    case 'checkbox':
      return CHECKBOX_PROPERTY_OPERATORS;

    case 'date':
      return [...BASE_PROPERTY_OPERATORS, ...DATE_OPERATORS];

    case 'list':
      return [...BASE_PROPERTY_OPERATORS, ...LIST_OPERATORS];

    default:
      return BASE_PROPERTY_OPERATORS;
  }
}

/**
 * Checks if an operator is valid for a specific criteria type
 * @param operator - The operator to validate
 * @param criteriaType - The criteria type to check against
 * @returns True if the operator is valid for the criteria type
 */
export function isOperatorValidForCriteriaType(
  operator: Operator,
  criteriaType: CriteriaType
): boolean {
  const validOperators = getOperatorsForCriteriaType(criteriaType);
  return validOperators.includes(operator);
}

/**
 * Checks if an operator is valid for a specific property type
 * @param operator - The operator to validate
 * @param propertyType - The property type to check against
 * @returns True if the operator is valid for the property type
 */
export function isOperatorValidForPropertyType(
  operator: Operator,
  propertyType: string
): boolean {
  const validOperators = getOperatorsForPropertyType(propertyType);
  return validOperators.includes(operator);
}

/**
 * Gets the default operator for a criteria type
 * @param criteriaType - The criteria type to get default operator for
 * @returns The default operator for the criteria type
 */
export function getDefaultOperatorForCriteriaType(
  criteriaType: CriteriaType
): Operator {
  switch (criteriaType) {
    case 'fileName':
    case 'folder':
    case 'extension':
    case 'headings':
      return 'contains';

    case 'tag':
    case 'links':
    case 'embeds':
      return 'includes item';

    case 'created_at':
    case 'modified_at':
      return 'is';

    case 'properties':
      return 'has any value';

    default:
      return 'contains';
  }
}

/**
 * Checks if an operator requires regex compilation
 * @param operator - The operator to check
 * @returns True if the operator uses regex patterns
 */
export function isRegexOperator(operator: Operator): boolean {
  const regexOperators: Operator[] = [
    'match regex',
    'does not match regex',
    'all match regex',
    'any match regex',
  ];
  return regexOperators.includes(operator);
}

/**
 * Gets all available property types
 * @returns Array of available property types
 */
export function getAvailablePropertyTypes(): string[] {
  return ['text', 'number', 'checkbox', 'date', 'list'];
}

/**
 * Checks if an operator requires a value input
 * @param operator - The operator to check
 * @returns true if operator needs a value, false otherwise
 */
export function operatorRequiresValue(operator: Operator): boolean {
  const noValueOperators: Operator[] = [
    'has any value',
    'has no value',
    'property is present',
    'property is missing',
    'is true',
    'is false',
  ];
  return !noValueOperators.includes(operator);
}

/**
 * Gets property type from Obsidian MetadataCache
 * @param app - Obsidian App instance
 * @param propertyName - Name of the property
 * @returns Property type or null if not found
 */
export function getPropertyTypeFromVault(
  app: App,
  propertyName: string
): 'text' | 'number' | 'checkbox' | 'date' | 'list' | null {
  const files = app.vault.getMarkdownFiles();

  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    if (cache?.frontmatter?.[propertyName]) {
      const value = cache.frontmatter[propertyName];
      return inferPropertyTypeFromValue(value);
    }
  }

  return null;
}

/**
 * Infers property type from a value
 * @param value - The value to analyze
 * @returns Inferred property type
 */
function inferPropertyTypeFromValue(
  value: any
): 'text' | 'number' | 'checkbox' | 'date' | 'list' {
  if (value === null || value === undefined) {
    return 'text'; // Default fallback
  }

  // Check for boolean/checkbox
  if (typeof value === 'boolean') {
    return 'checkbox';
  }

  // Check for number
  if (typeof value === 'number') {
    return 'number';
  }

  // Check for date (ISO string or date-like string)
  if (typeof value === 'string') {
    // Check if it's a date string
    if (isDateString(value)) {
      return 'date';
    }

    // Check if it's a list (comma-separated or array-like)
    if (isListProperty(value)) {
      return 'list';
    }
  }

  // Check for array (list)
  if (Array.isArray(value)) {
    return 'list';
  }

  // Default to text
  return 'text';
}

/**
 * Checks if a string represents a date
 * @param value - String to check
 * @returns true if string appears to be a date
 */
function isDateString(value: string): boolean {
  // Check for ISO date format
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  // Check for other common date formats
  if (
    /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value) ||
    /^\d{1,2}\.\d{1,2}\.\d{4}/.test(value)
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a value represents a list property
 * @param value - Value to check
 * @returns true if value appears to be a list
 */
function isListProperty(value: any): boolean {
  if (Array.isArray(value)) {
    return true;
  }

  if (typeof value === 'string') {
    // Check for comma-separated values
    if (value.includes(',') && value.split(',').length > 1) {
      return true;
    }

    // Check for array-like string representation
    if (value.startsWith('[') && value.endsWith(']')) {
      return true;
    }
  }

  return false;
}
