import { CachedMetadata } from "obsidian";

/**
 * Gets all tags from a file's metadata
 */
export function getAllTags(cache: CachedMetadata): string[] {
    if (!cache.tags) return [];
    return cache.tags.map(tag => tag.tag);
} 