import { FileMetadata } from '../types/Common';

/**
 * Template engine for rendering dynamic property values in rule destinations
 *
 * Supports template syntax like {{propertyName}} or {{getPropertyValue:propertyName}}
 * to dynamically insert frontmatter property values into folder paths.
 *
 * Example: /Personal/Tasks/{{status}} -> /Personal/Tasks/In progress
 *
 * @since 0.5.2
 */
export class TemplateEngine {
  /**
   * Renders a template destination string by replacing template placeholders with actual property values
   *
   * @param destination - Destination path with template syntax (e.g., "/Personal/Tasks/{{status}}")
   * @param metadata - File metadata containing properties
   * @returns Rendered destination path with property values substituted
   */
  public static renderTemplate(
    destination: string,
    metadata: FileMetadata
  ): string {
    if (!destination || typeof destination !== 'string') {
      return destination;
    }

    // Pattern to match {{propertyName}} or {{getPropertyValue:propertyName}}
    const templatePattern = /\{\{(?:getPropertyValue:)?([^}]+)\}\}/g;

    let result = destination;
    let match;

    // Replace all template placeholders
    while ((match = templatePattern.exec(destination)) !== null) {
      const fullMatch = match[0]; // e.g., "{{status}}" or "{{getPropertyValue:status}}"
      const propertyName = match[1].trim(); // e.g., "status"

      const replacement = this.getPropertyValue(propertyName, metadata);

      // Replace the placeholder with the actual value
      result = result.replace(fullMatch, replacement);
    }

    // Clean up path: remove double slashes and trailing slashes
    result = this.cleanPath(result);

    return result;
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
   * Cleans up the final path by removing double slashes and trailing slashes
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

    // Remove trailing slash (unless it's the root path)
    if (cleaned.length > 1 && cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }

    return cleaned;
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
}
