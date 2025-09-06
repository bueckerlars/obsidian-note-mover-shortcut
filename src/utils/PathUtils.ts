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