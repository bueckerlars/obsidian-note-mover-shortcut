export interface PreviewEntry {
  /** The file being analyzed */
  fileName: string;
  /** Current path of the file */
  currentPath: string;
  /** Target destination path if move would succeed */
  targetPath: string | null;
  /** Whether the file would be moved successfully */
  willBeMoved: boolean;
  /** The rule that would be applied (if any) */
  matchedRule?: string;
  /** The reason why the file is blocked (if blocked) */
  blockReason?: string;
  /** The filter that blocked the move (if any) */
  blockingFilter?: string;
  /** File tags for display */
  tags: string[];
}

export interface MovePreview {
  /** Files that would be successfully moved */
  successfulMoves: PreviewEntry[];
  /** Total number of files analyzed */
  totalFiles: number;
  /** Settings used for this preview */
  settings: {
    isFilterWhitelist: boolean; // Always false now (blacklist mode)
  };
}
