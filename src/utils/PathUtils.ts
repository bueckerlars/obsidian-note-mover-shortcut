import { App } from 'obsidian';

const INVALID_PATH_CHARS = /[<>:"\\|?*]/g;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function unwrapWikilinks(value: string): string {
  return value.replace(/\[\[([^\]]+)\]\]/g, (_match, inner: string) => {
    // Prefer alias text for [[target|alias]] and drop heading/block suffixes.
    const aliasOrTarget = inner.split('|').pop()?.trim() || '';
    return aliasOrTarget.replace(/[#^].*$/, '').trim();
  });
}

function sanitizePathSegment(segment: string): string {
  segment = unwrapWikilinks(segment);

  // Remove characters that are invalid on major desktop filesystems.
  let sanitized = segment
    .replace(INVALID_PATH_CHARS, '')
    .split('')
    .filter(char => char.charCodeAt(0) >= 32)
    .join('');

  // Windows does not allow trailing spaces or periods in a segment.
  sanitized = sanitized.replace(/[. ]+$/g, '');

  if (sanitized === '.' || sanitized === '..') {
    return '';
  }

  if (WINDOWS_RESERVED_NAMES.test(sanitized)) {
    sanitized = `${sanitized}_`;
  }

  return sanitized;
}

/**
 * Formats a path correctly by removing double slashes
 * and ensuring the path is relative to vault root (no leading slash)
 */
export function formatPath(path: string): string {
  // Handle empty path
  if (!path || path === '/') {
    return '';
  }

  // Remove double slashes first
  path = path.replace(/\/+/g, '/');

  // Sanitize each path segment while preserving folder separators.
  path = path
    .split('/')
    .map(segment => sanitizePathSegment(segment))
    .filter(segment => segment.length > 0)
    .join('/');

  // Remove trailing slash
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  // Remove leading slash to make path relative to vault root
  if (path.startsWith('/')) {
    path = path.slice(1);
  }

  return path;
}

/**
 * Combines a folder path with a filename
 */
export function combinePath(folder: string, file: string): string {
  // If the folder is empty or root path, return just the filename
  if (!folder || folder === '/' || folder === '') {
    return file;
  }

  // Format the folder first to ensure no leading/trailing slashes
  const formattedFolder = formatPath(folder);

  // If folder is empty after formatting, return just the filename
  if (!formattedFolder) {
    return file;
  }

  return formattedFolder + '/' + file;
}

/**
 * Extracts the parent path from a full file path
 * @param fullPath - The full path including filename
 * @returns The parent directory path, or empty string if no parent
 */
export function getParentPath(fullPath: string): string {
  if (!fullPath) {
    return '';
  }

  const lastSlashIndex = fullPath.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    // No slash found, file is in root directory
    return '';
  }

  return fullPath.substring(0, lastSlashIndex);
}

/**
 * Ensures that a folder exists in the vault, creating it if necessary
 * @param app - The Obsidian App instance
 * @param folderPath - The path of the folder to ensure exists
 * @returns Promise<boolean> - true if folder exists or was created successfully, false on error
 */
export async function ensureFolderExists(
  app: App,
  folderPath: string
): Promise<boolean> {
  // Handle empty or root paths
  if (!folderPath || folderPath === '/' || folderPath === '') {
    return true; // Root always exists
  }

  // Format the path to ensure consistency
  const formattedPath = formatPath(folderPath);
  if (!formattedPath) {
    return true; // Root path after formatting
  }

  try {
    // Check if folder already exists
    const exists = await app.vault.adapter.exists(formattedPath);
    if (exists) {
      return true;
    }

    // Create the folder
    await app.vault.createFolder(formattedPath);
    return true;
  } catch (error) {
    console.error(`Failed to create folder ${formattedPath}:`, error);
    return false;
  }
}
