/**
 * Common type definitions used throughout the application
 */

export type NotificationType = 'info' | 'error' | 'update' | 'success' | 'warning';

export type OperationType = 'single' | 'bulk' | 'periodic';

/**
 * Complete metadata extracted from a file for rule matching and processing
 */
export interface FileMetadata {
    fileName: string;
    filePath: string;
    tags: string[];
    properties: Record<string, any>;
    fileContent: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}
