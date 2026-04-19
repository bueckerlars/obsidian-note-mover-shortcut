import type { FileMetadata } from '../../types/Common';
import { parseListProperty } from '../property/parseListProperty';
import { isListProperty } from '../property/isListProperty';

/**
 * Blacklist filter strings (tag:, fileName:, path:, …) and V1-style criteria evaluation.
 * No Obsidian APIs.
 */
export class BlacklistFilterEngine {
  private readonly regexCache = new Map<string, RegExp>();

  private getCachedRegex(pattern: string, flags: string): RegExp {
    const key = `${pattern}|||${flags}`;
    let regex = this.regexCache.get(key);
    if (!regex) {
      regex = new RegExp(pattern, flags);
      this.regexCache.set(key, regex);
    }
    return regex;
  }

  matchTag(fileTags: string[], ruleTag: string): boolean {
    if (fileTags.includes(ruleTag)) {
      return true;
    }
    return fileTags.some(fileTag => fileTag.startsWith(ruleTag + '/'));
  }

  matchFileName(fileName: string, pattern: string): boolean {
    if (fileName === pattern) {
      return true;
    }
    if (pattern.includes('*') || pattern.includes('?')) {
      let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      regexPattern = regexPattern.replace(/\*/g, '.*').replace(/\?/g, '.');
      const regex = this.getCachedRegex(`^${regexPattern}$`, 'i');
      return regex.test(fileName);
    }
    return fileName.toLowerCase() === pattern.toLowerCase();
  }

  matchProperty(
    properties: Record<string, unknown>,
    criteria: string
  ): boolean {
    const colonIndex = criteria.indexOf(':');

    if (colonIndex === -1) {
      const key = criteria.trim();
      return (
        Object.prototype.hasOwnProperty.call(properties, key) &&
        properties[key] !== undefined &&
        properties[key] !== null
      );
    }

    const key = criteria.substring(0, colonIndex).trim();
    const expectedValue = criteria.substring(colonIndex + 1).trim();

    if (!Object.prototype.hasOwnProperty.call(properties, key)) {
      return false;
    }

    const actualValue = properties[key];

    if (actualValue === null || actualValue === undefined) {
      return false;
    }

    if (isListProperty(actualValue)) {
      const listItems = parseListProperty(actualValue);
      const expectedValueLower = expectedValue.toLowerCase();
      return listItems.some(item => item.toLowerCase() === expectedValueLower);
    }

    const actualValueStr = String(actualValue).toLowerCase();
    const expectedValueStr = expectedValue.toLowerCase();
    return actualValueStr === expectedValueStr;
  }

  evaluateCriteria(metadata: FileMetadata, criteria: string): boolean {
    const match = criteria.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!match || !match[1]) return false;

    const type = match[1];
    const value = match[2] ?? '';
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

  evaluateFilter(metadata: FileMetadata, filter: string[]): boolean {
    if (filter.length === 0) {
      return true;
    }
    for (const filterStr of filter) {
      if (this.evaluateCriteria(metadata, filterStr)) {
        return false;
      }
    }
    return true;
  }

  getFilterMatchDetails(
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
      if (this.evaluateCriteria(metadata, filterStr)) {
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
