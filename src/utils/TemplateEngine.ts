import { FileMetadata } from '../types/Common';

/**
 * Template engine for rendering dynamic property values in rule destinations
 *
 * Supports template syntax:
 * - {{propertyName}} or {{getPropertyValue:propertyName}} - Property values
 * - {{propertyName|defaultValue}} - Property with fallback default
 * - {{tag:tagName}} - Tag values (extracts deepest level)
 *
 * Example: /Personal/Tasks/{{status}} -> /Personal/Tasks/In_progress
 * Example: /Personal/Tasks/{{status|pending}} -> /Personal/Tasks/pending (if status missing)
 * Example: /Personal/Tasks/{{tag:tasks/personal}} -> /Personal/Tasks/personal
 *
 * @since 0.5.2
 */
export interface TemplateRenderResult {
  path: string;
  warnings: string[];
  errors: string[];
}

export class TemplateEngine {
  /**
   * Renders a template destination string by replacing template placeholders with actual property values
   *
   * @param destination - Destination path with template syntax (e.g., "/Personal/Tasks/{{status}}")
   * @param metadata - File metadata containing properties
   * @param showWarnings - Whether to show warnings for missing properties (default: false)
   * @returns Rendered destination path with property values substituted
   */
  public static renderTemplate(
    destination: string,
    metadata: FileMetadata,
    showWarnings = false
  ): string {
    const result = this.renderTemplateWithValidation(
      destination,
      metadata,
      showWarnings
    );
    return result.path;
  }

  /**
   * Renders template with validation and returns warnings/errors
   *
   * @param destination - Destination path with template syntax
   * @param metadata - File metadata containing properties
   * @param showWarnings - Whether warnings should be included in result
   * @returns TemplateRenderResult with path, warnings, and errors
   */
  public static renderTemplateWithValidation(
    destination: string,
    metadata: FileMetadata,
    showWarnings = false
  ): TemplateRenderResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!destination || typeof destination !== 'string') {
      return { path: destination, warnings, errors };
    }

    // Pattern to match:
    // - {{propertyName}} or {{getPropertyValue:propertyName}}
    // - {{propertyName|default}}
    // - {{tag:tagName}} or {{getPropertyValue:tag:tagName}}
    // Note: We need to handle getPropertyValue: prefix before tag: check
    const templatePattern =
      /\{\{(?:getPropertyValue:)?([^}|]+)(?:\|([^}]+))?\}\}/g;

    // Use replace() with callback to replace all template placeholders
    const result = destination.replace(
      templatePattern,
      (fullMatch: string, identifier: string, defaultValue?: string) => {
        let trimmedIdentifier = identifier.trim();
        const trimmedDefault = defaultValue?.trim();

        // Remove getPropertyValue: prefix if present (for both properties and tags)
        if (trimmedIdentifier.startsWith('getPropertyValue:')) {
          trimmedIdentifier = trimmedIdentifier
            .substring('getPropertyValue:'.length)
            .trim();
        }

        // Check if this is a tag reference
        if (trimmedIdentifier.startsWith('tag:')) {
          const tagName = trimmedIdentifier.substring(4).trim();
          let replacement = this.getTagValue(tagName, metadata);
          if (replacement === '') {
            if (trimmedDefault) {
              replacement = this.sanitizePathValue(trimmedDefault);
              // If default also becomes empty after sanitization, warn
              if (replacement === '' && showWarnings) {
                warnings.push(
                  `Default value for tag "${tagName}" became empty after sanitization. Template placeholder "${fullMatch}" will be empty.`
                );
              }
              return replacement;
            }
            if (showWarnings) {
              warnings.push(
                `Tag "${tagName}" not found in file. Template placeholder "${fullMatch}" will be empty.`
              );
            }
            return ''; // Return empty if no default
          }
          return replacement;
        }

        // Property reference
        let replacement = this.getPropertyValue(trimmedIdentifier, metadata);

        // Check if replacement is empty after sanitization
        if (replacement === '') {
          if (trimmedDefault) {
            // Use fallback default value
            replacement = this.sanitizePathValue(trimmedDefault);
            // If default also becomes empty after sanitization, warn
            if (replacement === '' && showWarnings) {
              warnings.push(
                `Default value for property "${trimmedIdentifier}" became empty after sanitization. Template placeholder "${fullMatch}" will be empty.`
              );
            }
            return replacement;
          }
          if (showWarnings) {
            warnings.push(
              `Property "${trimmedIdentifier}" not found in metadata. Template placeholder "${fullMatch}" will be empty. Available properties: ${
                metadata.properties
                  ? Object.keys(metadata.properties).join(', ') || 'none'
                  : 'none'
              }`
            );
          }
        }

        return replacement;
      }
    );

    // Validate path for empty segments BEFORE cleaning (to detect actual issues)
    const pathValidation = this.validatePath(result);
    if (pathValidation.hasEmptySegments) {
      errors.push(
        `Template resulted in invalid path with empty segments. Please ensure all template placeholders have values or provide defaults.`
      );
    }

    // Clean up path: remove double slashes, trailing slashes, and empty segments
    const cleanedPath = this.cleanPath(result);

    // Validate cleaned path for other issues (path injection, etc.)
    const cleanedPathValidation = this.validatePath(cleanedPath);
    if (
      cleanedPathValidation.issues.length > 0 &&
      !cleanedPathValidation.hasEmptySegments
    ) {
      // Only report non-empty-segment issues from cleaned path
      for (const issue of cleanedPathValidation.issues) {
        errors.push(`Path validation issue: ${issue}`);
      }
    }

    return {
      path: cleanedPath,
      warnings,
      errors,
    };
  }

  /**
   * Extracts property value from metadata and applies transformations
   *
   * @param propertyName - Name of the property to extract
   * @param metadata - File metadata
   * @returns Sanitized property value or empty string if not found
   */
  private static getPropertyValue(
    propertyName: string,
    metadata: FileMetadata
  ): string {
    if (!propertyName || !metadata.properties) {
      return '';
    }

    const value = metadata.properties[propertyName];

    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Handle arrays: take first value
    let stringValue: string;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '';
      }
      stringValue = String(value[0]);
    } else if (typeof value === 'object') {
      // Handle nested objects - convert to JSON string (user can access nested properties if needed)
      // For now, we'll return empty string as nested objects aren't directly usable in paths
      return '';
    } else {
      stringValue = String(value);
    }

    // Extract deepest level from hierarchical values (e.g., "tasks/todo" -> "todo")
    stringValue = this.extractDeepestLevel(stringValue);

    // Sanitize for file paths
    stringValue = this.sanitizePathValue(stringValue);

    return stringValue;
  }

  /**
   * Extracts tag value from metadata
   *
   * @param tagName - Name of the tag to extract (can be hierarchical like "tasks/personal")
   * @param metadata - File metadata
   * @returns Sanitized tag value or empty string if not found
   */
  private static getTagValue(tagName: string, metadata: FileMetadata): string {
    if (!tagName || !metadata.tags || metadata.tags.length === 0) {
      return '';
    }

    // Normalize tag name (remove leading # if present, add it for matching)
    const normalizedTagName = tagName.startsWith('#') ? tagName : `#${tagName}`;

    // Find matching tag (exact match or hierarchical match)
    const matchingTag = metadata.tags.find(tag => {
      // Exact match
      if (tag === normalizedTagName) {
        return true;
      }
      // Hierarchical match: tag starts with the requested tag
      if (tag.startsWith(normalizedTagName + '/')) {
        return true;
      }
      return false;
    });

    if (!matchingTag) {
      return '';
    }

    // Extract deepest level from tag
    const tagValue = this.extractDeepestLevel(matchingTag);
    return this.sanitizePathValue(tagValue);
  }

  /**
   * Extracts the deepest level from a hierarchical value
   * Examples:
   * - "#tasks/todo" -> "todo"
   * - "category/subcategory/item" -> "item"
   * - "simple" -> "simple"
   *
   * @param value - Property value (may contain slashes or hash prefixes)
   * @returns Deepest level value
   */
  private static extractDeepestLevel(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Remove leading hash if present (for tags)
    const cleaned = value.startsWith('#') ? value.substring(1) : value;

    // Split by slash and take last part
    const parts = cleaned.split('/');
    return parts[parts.length - 1] || '';
  }

  /**
   * Sanitizes a property value to be safe for use in file paths
   *
   * - Replaces spaces with underscores or hyphens
   * - Removes invalid path characters
   * - Trims whitespace
   *
   * @param value - Property value to sanitize
   * @returns Sanitized value safe for file paths
   */
  private static sanitizePathValue(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Trim whitespace
    let sanitized = value.trim();

    if (sanitized.length === 0) {
      return '';
    }

    // Replace spaces with underscores (preferable for file names)
    sanitized = sanitized.replace(/\s+/g, '_');

    // Remove invalid file path characters: / \ : * ? " < > |
    // Note: We allow slashes in input but remove them here since we only want the deepest level
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

    // Remove leading/trailing dots and spaces that might remain
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

    return sanitized;
  }

  /**
   * Cleans up the final path by removing double slashes, trailing slashes, and empty segments
   *
   * @param path - Path to clean
   * @returns Cleaned path
   */
  private static cleanPath(path: string): string {
    if (!path || typeof path !== 'string') {
      return path;
    }

    // Replace multiple consecutive slashes with single slash
    let cleaned = path.replace(/\/+/g, '/');

    // Split into segments and filter out empty segments
    const segments = cleaned
      .split('/')
      .filter(segment => segment.trim() !== '');

    // Rejoin segments
    cleaned = segments.join('/');

    // Remove trailing slash (unless it's the root path)
    if (cleaned.length > 1 && cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }

    // Ensure path doesn't start with // (but allow single / for root)
    if (cleaned.startsWith('//')) {
      cleaned = cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Validates a path for empty segments and other issues
   *
   * @param path - Path to validate
   * @returns Validation result with hasEmptySegments flag
   */
  private static validatePath(path: string): {
    hasEmptySegments: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!path || typeof path !== 'string') {
      return { hasEmptySegments: false, issues };
    }

    // Check for empty segments (double slashes indicate empty segment, or empty segments after split)
    const segments = path.split('/');
    const hasEmptySegments =
      path.includes('//') || segments.some(s => s.trim() === '' && s !== '');

    if (hasEmptySegments) {
      issues.push('Path contains empty segments');
    }

    // Check for path injection attempts (relative paths)
    if (path.includes('../') || path.includes('..\\')) {
      issues.push('Path contains relative path components (../)');
    }

    // Check for absolute paths on Windows (C:, D:, etc.)
    if (/^[A-Za-z]:/.test(path)) {
      issues.push('Path appears to be an absolute Windows path');
    }

    return {
      hasEmptySegments,
      issues,
    };
  }

  /**
   * Checks if a destination string contains template syntax
   *
   * @param destination - Destination path to check
   * @returns True if template syntax is present
   */
  public static hasTemplateSyntax(destination: string): boolean {
    if (!destination || typeof destination !== 'string') {
      return false;
    }

    // Check for {{...}} pattern
    return /\{\{[^}]+\}\}/.test(destination);
  }

  /**
   * Validates template syntax in a destination string
   *
   * @param destination - Destination path to validate
   * @param availableProperties - Optional list of available property names for validation
   * @returns Array of validation errors (empty if valid)
   */
  public static validateTemplateSyntax(
    destination: string,
    availableProperties?: string[]
  ): string[] {
    const errors: string[] = [];

    if (!destination || typeof destination !== 'string') {
      return errors;
    }

    // Find all template placeholders
    const templatePattern =
      /\{\{(?:getPropertyValue:)?([^}|]+)(?:\|([^}]+))?\}\}/g;
    const matches = Array.from(destination.matchAll(templatePattern));

    for (const match of matches) {
      let identifier = match[1]?.trim();
      if (!identifier) {
        errors.push(`Invalid template syntax: "${match[0]}"`);
        continue;
      }

      // Remove getPropertyValue: prefix if present (for both properties and tags)
      if (identifier.startsWith('getPropertyValue:')) {
        identifier = identifier.substring('getPropertyValue:'.length).trim();
      }

      // Check if it's a tag reference
      if (identifier.startsWith('tag:')) {
        // Tag references are always valid (we can't validate tag existence at edit time)
        continue;
      }

      // Check if property exists (if availableProperties is provided)
      if (availableProperties && !availableProperties.includes(identifier)) {
        // Check if it has a default value
        if (!match[2]) {
          errors.push(
            `Property "${identifier}" not found in available properties. Consider adding a default value: {{${identifier}|default}}`
          );
        }
      }
    }

    return errors;
  }
}
