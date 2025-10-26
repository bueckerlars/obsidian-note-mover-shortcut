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
  const valueSamples: any[] = [];

  // Collect samples of the property value from multiple files
  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    if (cache?.frontmatter?.[propertyName] !== undefined) {
      valueSamples.push(cache.frontmatter[propertyName]);
    }
  }

  if (valueSamples.length === 0) {
    return null;
  }

  // Analyze all samples to determine the most likely type
  return inferPropertyTypeFromSamples(valueSamples);
}

/**
 * Infers property type from multiple value samples
 * @param samples - Array of value samples to analyze
 * @returns Inferred property type
 */
export function inferPropertyTypeFromSamples(
  samples: any[]
): 'text' | 'number' | 'checkbox' | 'date' | 'list' {
  const typeCounts = {
    text: 0,
    number: 0,
    checkbox: 0,
    date: 0,
    list: 0,
  };

  // Analyze each sample
  for (const sample of samples) {
    const inferredType = inferPropertyTypeFromValue(sample);
    typeCounts[inferredType]++;
  }

  // Find the most common type
  let maxCount = 0;
  let mostCommonType: 'text' | 'number' | 'checkbox' | 'date' | 'list' = 'text';

  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonType = type as 'text' | 'number' | 'checkbox' | 'date' | 'list';
    }
  }

  // Special handling for mixed types
  if (maxCount === 0) {
    return 'text'; // Fallback
  }

  // If we have a clear majority (more than 50%), use that type
  if (maxCount > samples.length / 2) {
    return mostCommonType;
  }

  // For mixed types, prefer more specific types over text
  if (typeCounts.list > 0) return 'list';
  if (typeCounts.date > 0) return 'date';
  if (typeCounts.number > 0) return 'number';
  if (typeCounts.checkbox > 0) return 'checkbox';

  return 'text';
}

/**
 * Infers property type from a value
 * @param value - The value to analyze
 * @returns Inferred property type
 */
export function inferPropertyTypeFromValue(
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

  // Check for array (list) - this should be checked before string
  if (Array.isArray(value)) {
    return 'list';
  }

  // Check for string values
  if (typeof value === 'string') {
    // Check if it's a date string (prioritize date detection)
    if (isDateString(value)) {
      return 'date';
    }

    // Check if it's a number string
    if (isNumberString(value)) {
      return 'number';
    }

    // Check if it's a boolean string
    if (isBooleanString(value)) {
      return 'checkbox';
    }

    // Check if it's a list (comma-separated or array-like)
    if (isListProperty(value)) {
      return 'list';
    }
  }

  // Default to text
  return 'text';
}

/**
 * Checks if a string represents a number
 * @param value - String to check
 * @returns true if string appears to be a number
 */
function isNumberString(value: string): boolean {
  // Remove whitespace
  const trimmed = value.trim();

  // Check if it's a valid number (including decimals and negative numbers)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    return !isNaN(num) && isFinite(num);
  }

  return false;
}

/**
 * Checks if a string represents a boolean
 * @param value - String to check
 * @returns true if string appears to be a boolean
 */
function isBooleanString(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'yes' ||
    trimmed === 'no' ||
    trimmed === 'on' ||
    trimmed === 'off' ||
    trimmed === '1' ||
    trimmed === '0'
  );
}

/**
 * Checks if a string represents a date
 * @param value - String to check
 * @returns true if string appears to be a date
 */
function isDateString(value: string): boolean {
  const trimmed = value.trim();

  // Check for ISO date format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    return !isNaN(date.getTime()) && date.toISOString().startsWith(trimmed);
  }

  // Check for ISO datetime format (YYYY-MM-DDTHH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    return !isNaN(date.getTime());
  }

  // Check for other common date formats
  if (
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed) ||
    /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed) ||
    /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmed) ||
    /^\d{1,2}\.\d{1,2}\.\d{2}$/.test(trimmed)
  ) {
    // Try different parsing approaches for ambiguous formats
    const date1 = new Date(trimmed);
    const date2 = new Date(
      trimmed.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1')
    ); // DD/MM/YYYY -> YYYY-MM-DD
    const date3 = new Date(
      trimmed.replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/, '$3-$2-$1')
    ); // DD.MM.YYYY -> YYYY-MM-DD

    return (
      !isNaN(date1.getTime()) ||
      !isNaN(date2.getTime()) ||
      !isNaN(date3.getTime())
    );
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
    const trimmed = value.trim();

    // Check for comma-separated values (must have at least 2 items)
    if (trimmed.includes(',')) {
      const parts = trimmed
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      if (parts.length > 1) {
        return true;
      }
    }

    // Check for YAML array-like string representation
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return true;
    }

    // Check for YAML list format (lines starting with -)
    if (trimmed.includes('\n-') || trimmed.startsWith('-')) {
      return true;
    }
  }

  return false;
}
