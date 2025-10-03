import { FileMetadata } from '../types/Common';
import { Rule } from '../types/Rule';
import { MetadataExtractor } from './MetadataExtractor';

/**
 * Handles all rule and filter matching logic for file processing
 *
 * Extracted from RuleManager to eliminate code duplication and improve reusability.
 * Provides centralized matching for tags, properties, and rule evaluation.
 *
 * @since 0.4.0
 */
export class RuleMatcher {
  private metadataExtractor: MetadataExtractor;

  constructor(metadataExtractor?: MetadataExtractor) {
    this.metadataExtractor =
      metadataExtractor || new MetadataExtractor({} as any);
  }
  /**
   * Matches tags hierarchically with parent-child relationships
   *
   * - Exact matches have highest priority
   * - Parent tags match subtags (e.g., #food matches #food/recipes)
   *
   * @param fileTags - Array of tags from the file
   * @param ruleTag - Tag pattern to match
   * @returns True if rule tag matches any file tag
   */
  public matchTag(fileTags: string[], ruleTag: string): boolean {
    // First check for exact match
    if (fileTags.includes(ruleTag)) {
      return true;
    }

    // Then check if any file tag is a subtag of the rule tag
    // Rule: #food should match #food/recipes, #food/breakfast, etc.
    return fileTags.some(fileTag => {
      if (fileTag.startsWith(ruleTag + '/')) {
        return true;
      }
      return false;
    });
  }

  /**
   * Matches file names with wildcard pattern support
   *
   * Supports:
   * - Exact matches: "test.md" matches "test.md"
   * - Wildcards: "Daily*" matches "Daily Test.md", "Daily Notes.md"
   * - Single character: "test?.md" matches "test1.md", "testA.md"
   * - Case insensitive matching
   *
   * @param fileName - The actual file name to match against
   * @param pattern - The pattern to match (may contain wildcards)
   * @returns True if fileName matches the pattern
   */
  public matchFileName(fileName: string, pattern: string): boolean {
    // 1. Exact match (for backward compatibility)
    if (fileName === pattern) {
      return true;
    }

    // 2. Wildcard pattern matching
    if (pattern.includes('*') || pattern.includes('?')) {
      // Convert wildcard pattern to regex
      // First escape all regex special characters except * and ?
      let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

      // Then convert wildcards to regex patterns
      regexPattern = regexPattern
        .replace(/\*/g, '.*') // * -> .*
        .replace(/\?/g, '.'); // ? -> .

      // Create case-insensitive regex
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(fileName);
    }

    // 3. Case-insensitive exact match (fallback)
    return fileName.toLowerCase() === pattern.toLowerCase();
  }

  /**
   * Matches frontmatter properties with flexible criteria
   * Now supports list properties by checking individual values
   *
   * @param properties - Frontmatter properties object
   * @param criteria - "key" for existence or "key:value" for exact match
   * @returns True if property matches criteria
   */
  public matchProperty(
    properties: Record<string, any>,
    criteria: string
  ): boolean {
    // Check if criteria contains a colon to separate key and value
    const colonIndex = criteria.indexOf(':');

    if (colonIndex === -1) {
      // Format: "key" - check if property exists
      const key = criteria.trim();
      return (
        properties.hasOwnProperty(key) &&
        properties[key] !== undefined &&
        properties[key] !== null
      );
    } else {
      // Format: "key:value" - check for exact value match
      const key = criteria.substring(0, colonIndex).trim();
      const expectedValue = criteria.substring(colonIndex + 1).trim();

      if (!properties.hasOwnProperty(key)) {
        return false;
      }

      const actualValue = properties[key];

      // Handle different value types
      if (actualValue === null || actualValue === undefined) {
        return false;
      }

      // Check if this is a list property and handle accordingly
      if (this.metadataExtractor.isListProperty(actualValue)) {
        return this.matchListProperty(actualValue, expectedValue);
      }

      // Convert both to strings for comparison to handle different types
      const actualValueStr = String(actualValue).toLowerCase();
      const expectedValueStr = expectedValue.toLowerCase();

      return actualValueStr === expectedValueStr;
    }
  }

  /**
   * Matches individual values within a list property
   *
   * @param listValue - The list property value (array or comma-separated string)
   * @param expectedValue - The value to match against
   * @returns True if any item in the list matches the expected value
   */
  private matchListProperty(listValue: any, expectedValue: string): boolean {
    const listItems = this.metadataExtractor.parseListProperty(listValue);
    const expectedValueLower = expectedValue.toLowerCase();

    return listItems.some(item => item.toLowerCase() === expectedValueLower);
  }

  /**
   * Evaluates a single criteria string against file metadata
   *
   * Supports: tag, fileName, path, content, created_at, updated_at, property
   *
   * @param metadata - File metadata object
   * @param criteria - Criteria in "type:value" format
   * @returns True if metadata matches criteria
   */
  public evaluateCriteria(metadata: FileMetadata, criteria: string): boolean {
    // Parse criteria string: type: value
    const match = criteria.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!match) return false;

    const type = match[1];
    const value = match[2];
    const {
      tags,
      fileName,
      filePath,
      createdAt,
      updatedAt,
      properties,
      fileContent,
    } = metadata;

    switch (type) {
      case 'tag':
        return this.matchTag(tags, value);
      case 'fileName':
        return this.matchFileName(fileName, value);
      case 'path':
        // For path filters, check if the file path starts with the filter value
        // This allows folder blacklisting to work (e.g., "Templates" matches "Templates/Meeting Notes.md")
        return filePath === value || filePath.startsWith(value + '/');
      case 'content':
        return fileContent.includes(value);
      case 'created_at':
        if (createdAt) return createdAt.toISOString().startsWith(value);
        return false;
      case 'updated_at':
        if (updatedAt) return updatedAt.toISOString().startsWith(value);
        return false;
      case 'property':
        return this.matchProperty(properties, value);
      default:
        return false;
    }
  }

  /**
   * Evaluates filter rules to determine if file should be processed
   * Filters now always work as blacklist (exclude matching files)
   *
   * @param metadata - File metadata object
   * @param filter - Array of filter criteria
   * @returns True if file should be processed
   */
  public evaluateFilter(metadata: FileMetadata, filter: string[]): boolean {
    if (filter.length === 0) {
      return true; // No filter means all files pass
    }

    for (const filterStr of filter) {
      const filterMatch = this.evaluateCriteria(metadata, filterStr);

      if (filterMatch) {
        return false; // Blacklist: file matches filter, so skip it
      }
    }

    return true; // File passes filter
  }

  /**
   * Finds the matching rule with user-defined order priority.
   *
   * Primary precedence: original user order (first match wins).
   * Tiebreaker: if multiple candidates share the same user-order position,
   *             prefer the more specific tag (more subtag levels).
   *
   * @param metadata - File metadata object
   * @param rules - Array of rules to evaluate
   * @returns First matching rule by user order, with specificity as tiebreaker
   */
  public findMatchingRule(metadata: FileMetadata, rules: Rule[]): Rule | null {
    // Collect matching rules with their original index and a specificity score
    const matchingWithMeta = rules
      .map((rule, index) => {
        // Compute a basic specificity score for tag rules based on hierarchy depth
        const tagMatch = rule.criteria.match(/^tag:\s*(.*)$/);
        const specificity = tagMatch
          ? (tagMatch[1].match(/\//g) || []).length
          : 0;

        return {
          rule,
          index,
          specificity,
        };
      })
      .filter(entry => this.evaluateCriteria(metadata, entry.rule.criteria));

    if (matchingWithMeta.length === 0) {
      return null;
    }

    // Sort by user order first, then by specificity (desc) as tiebreaker
    matchingWithMeta.sort((a, b) => {
      if (a.index !== b.index) {
        return a.index - b.index; // earlier user-defined rule wins
      }
      return b.specificity - a.specificity; // tiebreaker: more specific tag wins
    });

    return matchingWithMeta[0].rule;
  }

  /**
   * Sorts rules by tag specificity (most specific first)
   *
   * @param rules - Array of rules to sort
   * @returns Rules sorted by hierarchy depth
   */
  public sortRulesBySpecificity(rules: Rule[]): Rule[] {
    return rules.slice().sort((a, b) => {
      const aCriteria = a.criteria.trim();
      const bCriteria = b.criteria.trim();
      const aMatch = aCriteria.match(/^tag:\s*(.*)$/);
      const bMatch = bCriteria.match(/^tag:\s*(.*)$/);

      if (aMatch && bMatch) {
        // Count the number of subtag levels (slashes)
        const aLevels = (aMatch[1].match(/\//g) || []).length;
        const bLevels = (bMatch[1].match(/\//g) || []).length;
        return bLevels - aLevels; // More specific (more slashes) first
      }
      return 0; // Keep original order for non-tag rules
    });
  }

  /**
   * Gets detailed filter match information for debugging/preview
   * Filters now always work as blacklist (exclude matching files)
   *
   * @param metadata - File metadata object
   * @param filter - Array of filter criteria
   * @returns Object with pass/fail status and blocking details
   */
  public getFilterMatchDetails(
    metadata: FileMetadata,
    filter: string[]
  ): {
    passes: boolean;
    blockingFilter?: string;
    blockReason?: string;
  } {
    if (filter.length === 0) {
      return { passes: true };
    }

    for (const filterStr of filter) {
      const filterMatch = this.evaluateCriteria(metadata, filterStr);

      if (filterMatch) {
        return {
          passes: false,
          blockingFilter: filterStr,
          blockReason: 'Blocked by blacklist filter',
        };
      }
    }

    return { passes: true };
  }
}
