/**
 * Formats a path correctly by removing double slashes
 * and ensuring the path starts with a slash
 */
export function formatPath(path: string): string {
    // Remove trailing slash if it's not the root path
    if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    // Ensure path starts with a slash
    if (!path.startsWith('/')) {
        path = '/' + path;
    }

    // Remove double slashes
    return path.replace(/\/+/g, '/');
}

/**
 * Combines a folder path with a filename
 */
export function combinePath(folder: string, file: string): string {
    // If the folder is the root path, return just the filename
    if (folder === '/') {
        return file;
    }

    return formatPath(folder + '/' + file);
} 