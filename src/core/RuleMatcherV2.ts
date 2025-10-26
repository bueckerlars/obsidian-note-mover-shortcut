import { FileMetadata } from '../types/Common';
import {
  RuleV2,
  Trigger,
  AggregationType,
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
import { MetadataExtractor } from './MetadataExtractor';

/**
 * Handles all rule and filter matching logic for RuleV2 system
 *
 * Provides centralized matching for all CriteriaTypes and Operators with
 * type-safe evaluation and aggregation support.
 *
 * @since 0.5.0
 */
export class RuleMatcherV2 {
  private metadataExtractor: MetadataExtractor;
  private regexCache: Map<string, RegExp>;

  constructor(metadataExtractor: MetadataExtractor) {
    this.metadataExtractor = metadataExtractor;
    this.regexCache = new Map();
  }

  /**
   * Finds the first matching rule based on user-defined order priority
   *
   * @param metadata - File metadata object
   * @param rules - Array of RuleV2 rules to evaluate
   * @returns First matching rule by user order, null if no match
   */
  public findMatchingRule(
    metadata: FileMetadata,
    rules: RuleV2[]
  ): RuleV2 | null {
    for (const rule of rules) {
      if (!rule.active) {
        continue; // Skip inactive rules
      }

      if (rule.triggers.length === 0) {
        continue; // Skip rules with no triggers
      }

      // Evaluate all triggers for this rule
      const triggerResults: boolean[] = [];
      for (const trigger of rule.triggers) {
        const result = this.evaluateTrigger(metadata, trigger);
        triggerResults.push(result);
      }

      // Apply aggregation logic
      if (this.evaluateAggregation(triggerResults, rule.aggregation)) {
        return rule; // First match wins
      }
    }

    return null; // No rule matched
  }

  /**
   * Evaluates a single trigger against file metadata
   *
   * @param metadata - File metadata object
   * @param trigger - Trigger to evaluate
   * @returns True if trigger matches metadata
   */
  public evaluateTrigger(metadata: FileMetadata, trigger: Trigger): boolean {
    switch (trigger.criteriaType) {
      case 'fileName':
        return this.evaluateTextOperator(
          metadata.fileName,
          trigger.operator as TextOperator,
          trigger.value
        );

      case 'folder':
        // Extract folder from filePath
        const folder =
          metadata.filePath.split('/').slice(0, -1).join('/') || '';
        return this.evaluateTextOperator(
          folder,
          trigger.operator as TextOperator,
          trigger.value
        );

      case 'extension':
        const extension = metadata.extension || '';
        return this.evaluateTextOperator(
          extension,
          trigger.operator as TextOperator,
          trigger.value
        );

      case 'headings':
        const headings = metadata.headings || [];
        return this.evaluateListOperator(
          headings,
          trigger.operator as ListOperator,
          trigger.value
        );

      case 'tag':
        return this.evaluateListOperator(
          metadata.tags,
          trigger.operator as ListOperator,
          trigger.value
        );

      case 'links':
        const links = metadata.links || [];
        return this.evaluateListOperator(
          links,
          trigger.operator as ListOperator,
          trigger.value
        );

      case 'embeds':
        const embeds = metadata.embeds || [];
        return this.evaluateListOperator(
          embeds,
          trigger.operator as ListOperator,
          trigger.value
        );

      case 'created_at':
        return this.evaluateDateOperator(
          metadata.createdAt,
          trigger.operator as DateOperator,
          trigger.value
        );

      case 'modified_at':
        return this.evaluateDateOperator(
          metadata.updatedAt,
          trigger.operator as DateOperator,
          trigger.value
        );

      case 'properties':
        return this.evaluatePropertyOperator(metadata.properties, trigger);

      default:
        return false; // Unknown criteria type
    }
  }

  /**
   * Evaluates aggregation logic for trigger results
   *
   * @param results - Array of boolean results from triggers
   * @param aggregation - Aggregation type (all, any, none)
   * @returns True if aggregation condition is met
   */
  private evaluateAggregation(
    results: boolean[],
    aggregation: AggregationType
  ): boolean {
    if (results.length === 0) {
      return false; // No triggers to evaluate
    }

    switch (aggregation) {
      case 'all':
        return results.every(result => result === true);

      case 'any':
        return results.some(result => result === true);

      case 'none':
        return results.every(result => result === false);

      default:
        return false; // Unknown aggregation type
    }
  }

  /**
   * Evaluates text-based operators (fileName, folder, extension, headings)
   *
   * @param value - Actual value to test
   * @param operator - Text operator to apply
   * @param expected - Expected value/pattern
   * @returns True if operator condition is met
   */
  private evaluateTextOperator(
    value: string,
    operator: TextOperator,
    expected: string
  ): boolean {
    const valueLower = value.toLowerCase();
    const expectedLower = expected.toLowerCase();

    switch (operator) {
      case 'is':
        return valueLower === expectedLower;

      case 'is not':
        return valueLower !== expectedLower;

      case 'contains':
        return valueLower.includes(expectedLower);

      case 'does not contain':
        return !valueLower.includes(expectedLower);

      case 'starts with':
        return valueLower.startsWith(expectedLower);

      case 'does not starts with':
        return !valueLower.startsWith(expectedLower);

      case 'ends with':
        return valueLower.endsWith(expectedLower);

      case 'does not ends with':
        return !valueLower.endsWith(expectedLower);

      case 'match regex':
        const regex = this.getRegex(expected);
        return regex !== null ? regex.test(value) : false;

      case 'does not match regex':
        const regexNot = this.getRegex(expected);
        return regexNot !== null ? !regexNot.test(value) : true;

      default:
        return false; // Unknown operator
    }
  }

  /**
   * Evaluates list-based operators (tag, links, embeds)
   *
   * @param items - Array of items to test
   * @param operator - List operator to apply
   * @param expected - Expected value/pattern
   * @returns True if operator condition is met
   */
  private evaluateListOperator(
    items: string[],
    operator: ListOperator,
    expected: string
  ): boolean {
    const expectedLower = expected.toLowerCase();

    switch (operator) {
      case 'includes item':
        return items.some(item => item.toLowerCase() === expectedLower);

      case 'does not include item':
        return !items.some(item => item.toLowerCase() === expectedLower);

      case 'all are':
        return (
          items.length > 0 &&
          items.every(item => item.toLowerCase() === expectedLower)
        );

      case 'all start with':
        return (
          items.length > 0 &&
          items.every(item => item.toLowerCase().startsWith(expectedLower))
        );

      case 'all end with':
        return (
          items.length > 0 &&
          items.every(item => item.toLowerCase().endsWith(expectedLower))
        );

      case 'all match regex':
        const regexAll = this.getRegex(expected);
        return (
          regexAll !== null &&
          items.length > 0 &&
          items.every(item => regexAll.test(item))
        );

      case 'any contain':
        return items.some(item => item.toLowerCase().includes(expectedLower));

      case 'any end with':
        return items.some(item => item.toLowerCase().endsWith(expectedLower));

      case 'any match regex':
        const regexAny = this.getRegex(expected);
        return regexAny !== null
          ? items.some(item => regexAny.test(item))
          : false;

      case 'none contain':
        return !items.some(item => item.toLowerCase().includes(expectedLower));

      case 'none start with':
        return !items.some(item =>
          item.toLowerCase().startsWith(expectedLower)
        );

      case 'none end with':
        return !items.some(item => item.toLowerCase().endsWith(expectedLower));

      case 'count is':
        const count = this.parseNumericValue(expected);
        return count !== null && items.length === count;

      case 'count is not':
        const countNot = this.parseNumericValue(expected);
        return countNot !== null && items.length !== countNot;

      case 'count is less than':
        const countLess = this.parseNumericValue(expected);
        return countLess !== null && items.length < countLess;

      case 'count is more than':
        const countMore = this.parseNumericValue(expected);
        return countMore !== null && items.length > countMore;

      default:
        return false; // Unknown operator
    }
  }

  /**
   * Evaluates date-based operators (created_at, modified_at)
   *
   * @param date - Date to test (can be null)
   * @param operator - Date operator to apply
   * @param expected - Expected value/pattern
   * @returns True if operator condition is met
   */
  private evaluateDateOperator(
    date: Date | null,
    operator: DateOperator,
    expected: string
  ): boolean {
    if (!date) {
      return false; // No date available
    }

    const now = new Date();
    const expectedDate = this.parseDate(expected);

    switch (operator) {
      case 'is':
        return expectedDate ? date.getTime() === expectedDate.getTime() : false;

      case 'is before':
        return expectedDate ? date < expectedDate : false;

      case 'is after':
        return expectedDate ? date > expectedDate : false;

      case 'time is before':
        return expectedDate ? date.getTime() < expectedDate.getTime() : false;

      case 'time is after':
        return expectedDate ? date.getTime() > expectedDate.getTime() : false;

      case 'time is before now':
        return date < now;

      case 'time is after now':
        return date > now;

      case 'date is':
        return expectedDate ? this.isSameDate(date, expectedDate) : false;

      case 'date is not':
        return expectedDate ? !this.isSameDate(date, expectedDate) : true;

      case 'date is before':
        return expectedDate ? this.isDateBefore(date, expectedDate) : false;

      case 'date is after':
        return expectedDate ? this.isDateAfter(date, expectedDate) : false;

      case 'date is today':
        return this.isSameDate(date, now);

      case 'date is not today':
        return !this.isSameDate(date, now);

      case 'is under X days ago':
        const daysUnder = this.parseNumericValue(expected);
        return daysUnder !== null
          ? this.isDaysAgo(date, daysUnder, 'under')
          : false;

      case 'is over X days ago':
        const daysOver = this.parseNumericValue(expected);
        return daysOver !== null
          ? this.isDaysAgo(date, daysOver, 'over')
          : false;

      case 'day of week is':
        return this.isDayOfWeek(date, expected);

      case 'day of week is not':
        return !this.isDayOfWeek(date, expected);

      case 'day of week is before':
        return this.isDayOfWeekBefore(date, expected);

      case 'day of week is after':
        return this.isDayOfWeekAfter(date, expected);

      case 'day of month is':
        const dayOfMonth = this.parseNumericValue(expected);
        return dayOfMonth !== null && date.getDate() === dayOfMonth;

      case 'day of month is not':
        const dayOfMonthNot = this.parseNumericValue(expected);
        return dayOfMonthNot !== null && date.getDate() !== dayOfMonthNot;

      case 'day of month is before':
        const dayOfMonthBefore = this.parseNumericValue(expected);
        return dayOfMonthBefore !== null && date.getDate() < dayOfMonthBefore;

      case 'day of month is after':
        const dayOfMonthAfter = this.parseNumericValue(expected);
        return dayOfMonthAfter !== null && date.getDate() > dayOfMonthAfter;

      case 'month is':
        const month = this.parseNumericValue(expected);
        return month !== null && date.getMonth() + 1 === month; // getMonth() is 0-based

      case 'month is not':
        const monthNot = this.parseNumericValue(expected);
        return monthNot !== null && date.getMonth() + 1 !== monthNot;

      case 'month is before':
        const monthBefore = this.parseNumericValue(expected);
        return monthBefore !== null && date.getMonth() + 1 < monthBefore;

      case 'month is after':
        const monthAfter = this.parseNumericValue(expected);
        return monthAfter !== null && date.getMonth() + 1 > monthAfter;

      case 'year is':
        const year = this.parseNumericValue(expected);
        return year !== null && date.getFullYear() === year;

      case 'year is not':
        const yearNot = this.parseNumericValue(expected);
        return yearNot !== null && date.getFullYear() !== yearNot;

      case 'year is before':
        const yearBefore = this.parseNumericValue(expected);
        return yearBefore !== null && date.getFullYear() < yearBefore;

      case 'year is after':
        const yearAfter = this.parseNumericValue(expected);
        return yearAfter !== null && date.getFullYear() > yearAfter;

      default:
        return false; // Unknown operator
    }
  }

  /**
   * Evaluates property-based operators with runtime type checking
   *
   * @param properties - Properties object from metadata
   * @param trigger - Trigger with property information
   * @returns True if property condition is met
   */
  private evaluatePropertyOperator(
    properties: Record<string, any>,
    trigger: Trigger
  ): boolean {
    if (!trigger.propertyName) {
      return false; // No property name specified
    }

    const propertyValue = properties[trigger.propertyName];
    const propertyType = trigger.propertyType || 'text';

    // Handle base property operators first
    switch (trigger.operator as BasePropertyOperator) {
      case 'has any value':
        return (
          propertyValue !== null &&
          propertyValue !== undefined &&
          propertyValue !== ''
        );

      case 'has no value':
        return (
          propertyValue === null ||
          propertyValue === undefined ||
          propertyValue === ''
        );

      case 'property is present':
        return properties.hasOwnProperty(trigger.propertyName);

      case 'property is missing':
        return !properties.hasOwnProperty(trigger.propertyName);
    }

    // Handle type-specific operators
    switch (propertyType) {
      case 'text':
        return this.evaluateTextPropertyOperator(
          propertyValue,
          trigger.operator as TextPropertyOperator,
          trigger.value
        );

      case 'number':
        return this.evaluateNumberPropertyOperator(
          propertyValue,
          trigger.operator as NumberPropertyOperator,
          trigger.value
        );

      case 'list':
        return this.evaluateListPropertyOperator(
          propertyValue,
          trigger.operator as ListPropertyOperator,
          trigger.value
        );

      case 'date':
        return this.evaluateDatePropertyOperator(
          propertyValue,
          trigger.operator as DatePropertyOperator,
          trigger.value
        );

      case 'checkbox':
        return this.evaluateCheckboxPropertyOperator(
          propertyValue,
          trigger.operator as CheckboxPropertyOperator,
          trigger.value
        );

      default:
        return false; // Unknown property type
    }
  }

  /**
   * Evaluates text property operators
   */
  private evaluateTextPropertyOperator(
    value: any,
    operator: TextPropertyOperator,
    expected: string
  ): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const valueStr = String(value);
    return this.evaluateTextOperator(
      valueStr,
      operator as TextOperator,
      expected
    );
  }

  /**
   * Evaluates number property operators
   */
  private evaluateNumberPropertyOperator(
    value: any,
    operator: NumberPropertyOperator,
    expected: string
  ): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const numValue = Number(value);
    const expectedNum = this.parseNumericValue(expected);

    if (isNaN(numValue) || expectedNum === null) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return numValue === expectedNum;

      case 'does not equal':
        return numValue !== expectedNum;

      case 'is less than':
        return numValue < expectedNum;

      case 'is more than':
        return numValue > expectedNum;

      case 'is divisible by':
        return expectedNum !== 0 && numValue % expectedNum === 0;

      case 'is not divisible by':
        return expectedNum !== 0 && numValue % expectedNum !== 0;

      default:
        return false;
    }
  }

  /**
   * Evaluates list property operators
   */
  private evaluateListPropertyOperator(
    value: any,
    operator: ListPropertyOperator,
    expected: string
  ): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const listItems = this.metadataExtractor.parseListProperty(value);
    return this.evaluateListOperator(
      listItems,
      operator as ListOperator,
      expected
    );
  }

  /**
   * Evaluates date property operators
   */
  private evaluateDatePropertyOperator(
    value: any,
    operator: DatePropertyOperator,
    expected: string
  ): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    let date: Date | null = null;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      date = new Date(value);
    } else if (typeof value === 'number') {
      date = new Date(value);
    }

    if (!date || isNaN(date.getTime())) {
      return false;
    }

    return this.evaluateDateOperator(date, operator as DateOperator, expected);
  }

  /**
   * Evaluates checkbox property operators
   */
  private evaluateCheckboxPropertyOperator(
    value: any,
    operator: CheckboxPropertyOperator,
    expected: string
  ): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const boolValue = Boolean(value);

    switch (operator) {
      case 'is true':
        return boolValue === true;

      case 'is false':
        return boolValue === false;

      default:
        return false;
    }
  }

  /**
   * Gets compiled regex from cache or compiles new one
   *
   * @param pattern - Regex pattern string
   * @returns Compiled RegExp or null if invalid
   */
  private getRegex(pattern: string): RegExp | null {
    if (this.regexCache.has(pattern)) {
      return this.regexCache.get(pattern)!;
    }

    try {
      const regex = new RegExp(pattern, 'i'); // Case insensitive
      this.regexCache.set(pattern, regex);
      return regex;
    } catch (error) {
      // Invalid regex pattern - don't cache and return null
      return null;
    }
  }

  /**
   * Parses numeric value from string
   *
   * @param value - String to parse
   * @returns Parsed number or null if invalid
   */
  private parseNumericValue(value: string): number | null {
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parses date from string
   *
   * @param value - Date string to parse
   * @returns Parsed Date or null if invalid
   */
  private parseDate(value: string): Date | null {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Checks if two dates are the same day (ignoring time)
   */
  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Checks if date1 is before date2 (ignoring time)
   */
  private isDateBefore(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1 < d2;
  }

  /**
   * Checks if date1 is after date2 (ignoring time)
   */
  private isDateAfter(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1 > d2;
  }

  /**
   * Checks if date is under/over X days ago
   */
  private isDaysAgo(date: Date, days: number, type: 'under' | 'over'): boolean {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return type === 'under' ? diffDays < days : diffDays > days;
  }

  /**
   * Checks if date matches day of week
   */
  private isDayOfWeek(date: Date, expectedDay: string): boolean {
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayIndex = dayNames.indexOf(expectedDay.toLowerCase());
    return dayIndex !== -1 && date.getDay() === dayIndex;
  }

  /**
   * Checks if date is before expected day of week
   */
  private isDayOfWeekBefore(date: Date, expectedDay: string): boolean {
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayIndex = dayNames.indexOf(expectedDay.toLowerCase());
    return dayIndex !== -1 && date.getDay() < dayIndex;
  }

  /**
   * Checks if date is after expected day of week
   */
  private isDayOfWeekAfter(date: Date, expectedDay: string): boolean {
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayIndex = dayNames.indexOf(expectedDay.toLowerCase());
    return dayIndex !== -1 && date.getDay() > dayIndex;
  }
}
