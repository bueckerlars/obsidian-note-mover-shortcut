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

/** Why a rule-based move was skipped without moving the file. */
export type FileMoveSkipReason =
  | 'missing_destination_folder'
  | 'conflict_skip'
  | 'cached_conflict_skip';

/** Result of attempting to move one file via rules. */
export type FileMoveResult =
  | { moved: false; skipReason?: FileMoveSkipReason }
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
