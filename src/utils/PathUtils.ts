/**
 * Formatiert einen Pfad korrekt, indem doppelte Slashes entfernt werden
 * und sichergestellt wird, dass der Pfad mit einem Slash beginnt
 */
export function formatPath(path: string): string {
    // Entferne doppelte Slashes
    let formattedPath = path.replace(/\/+/g, '/');
    
    // Stelle sicher, dass der Pfad mit einem Slash beginnt
    if (!formattedPath.startsWith('/')) {
        formattedPath = '/' + formattedPath;
    }
    
    // Entferne den Slash am Ende, wenn es nicht der Root-Pfad ist
    if (formattedPath !== '/' && formattedPath.endsWith('/')) {
        formattedPath = formattedPath.slice(0, -1);
    }
    
    return formattedPath;
}

/**
 * Kombiniert einen Ordnerpfad mit einem Dateinamen
 */
export function combinePath(folderPath: string, fileName: string): string {
    const formattedFolder = formatPath(folderPath);
    // Wenn der Ordner der Root-Pfad ist, geben wir nur den Dateinamen zurück
    return formattedFolder === '/' ? fileName : `${formattedFolder}/${fileName}`;
} 