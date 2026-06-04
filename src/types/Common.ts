/**
 * Common type definitions used throughout the application
 */

export type NotificationType =
  | 'info'
  | 'error'
  | 'update'
  | 'success'
  | 'warning';

export type OperationType = 'single' | 'bulk' | 'periodic';

/** Result of attempting to move one file via rules. */
export type FileMoveResult =
  | { moved: false }
  | { moved: true; targetFolder: string };

/**
 * Complete metadata extracted from a file for rule matching and processing
 */
export interface FileMetadata {
  fileName: string;
  filePath: string;
  tags: string[];
  properties: Record<string, unknown>;
  fileContent: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  // RuleV2 specific fields (optional for backward compatibility)
  extension?: string;
  links?: string[];
  embeds?: string[];
  headings?: string[];
}
