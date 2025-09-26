import { App, TFile } from 'obsidian';
import { createError, handleError } from '../utils/Error';
import { NoticeManager } from '../utils/NoticeManager';
import {
  getParentPath,
  ensureFolderExists,
  combinePath,
} from '../utils/PathUtils';
import { HistoryEntry } from '../types/HistoryEntry';
import NoteMoverShortcutPlugin from 'main';

/**
 * Central service for all file movement operations
 *
 * Provides unified API for moving files, undo operations, and batch movements.
 * Eliminates code duplication between NoteMoverShortcut, HistoryManager, and PreviewModal.
 *
 * Features: plugin move tracking, folder creation, history integration, batch operations
 *
 * @since 0.4.0
 */
export class FileMovementService {
  private isPluginMove = false; // Flag to detect internal plugin moves

  constructor(
    private app: App,
    private plugin: NoteMoverShortcutPlugin
  ) {}

  /**
   * Marks start of internal plugin move (prevents history tracking loops)
   */
  public markPluginMoveStart(): void {
    this.isPluginMove = true;
  }

  /**
   * Marks end of internal plugin move (call in finally block)
   */
  public markPluginMoveEnd(): void {
    this.isPluginMove = false;
  }

  /**
   * Checks if currently in a plugin move operation
   *
   * @returns True if plugin move in progress
   */
  public isInPluginMove(): boolean {
    return this.isPluginMove;
  }

  /**
   * Validates that a file exists and is a TFile instance
   *
   * @param filePath - Path to validate
   * @returns TFile if exists, null otherwise
   */
  public validateFileExists(filePath: string): TFile | null {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!file) {
      return null;
    }
    // In test environment, we don't have real TFile instances
    // Check if it has the properties we expect from a TFile
    if (typeof file === 'object' && 'path' in file && 'name' in file) {
      return file as TFile;
    }
    return null;
  }

  /**
   * Performs file move with error handling and tracking
   *
   * Handles folder creation, plugin move tracking, history, and notifications
   *
   * @param file - TFile to move
   * @param targetPath - Complete target path
   * @param options - Move configuration
   * @returns True if successful
   */
  public async moveFile(
    file: TFile,
    targetPath: string,
    options: {
      trackInHistory?: boolean;
      showNotifications?: boolean;
      originalPath?: string;
    } = {}
  ): Promise<boolean> {
    const {
      trackInHistory = true,
      showNotifications = false,
      originalPath = file.path,
    } = options;

    try {
      // Ensure target folder exists
      const targetFolder = getParentPath(targetPath);
      if (targetFolder && !(await ensureFolderExists(this.app, targetFolder))) {
        const error = `Failed to create target folder: ${targetFolder}`;
        handleError(createError(error), 'moveFile', showNotifications);
        return false;
      }

      // Mark plugin move start
      this.markPluginMoveStart();

      try {
        // Perform the actual file move
        await this.app.fileManager.renameFile(file, targetPath);

        // Add to history if requested
        if (trackInHistory) {
          this.plugin.historyManager.addEntry({
            sourcePath: originalPath,
            destinationPath: targetPath,
            fileName: file.name,
          });
        }

        if (showNotifications) {
          NoticeManager.success(`Moved ${file.name} to ${targetPath}`);
        }

        return true;
      } finally {
        // Always mark plugin move end, even on errors
        this.markPluginMoveEnd();
      }
    } catch (error) {
      const errorMsg = `Error moving file '${file.path}' to '${targetPath}'`;
      handleError(error, errorMsg, showNotifications);
      return false;
    }
  }

  /**
   * Moves file to folder (combines folder path with filename)
   *
   * @param file - TFile to move
   * @param targetFolder - Target folder path
   * @param options - Same as moveFile()
   * @returns True if successful
   */
  public async moveFileToFolder(
    file: TFile,
    targetFolder: string,
    options: {
      trackInHistory?: boolean;
      showNotifications?: boolean;
      originalPath?: string;
    } = {}
  ): Promise<boolean> {
    const targetPath = combinePath(targetFolder, file.name);
    return this.moveFile(file, targetPath, options);
  }

  /**
   * Undoes a move operation by moving file back to original location
   *
   * @param destinationPath - Current file location
   * @param sourcePath - Original location to restore
   * @param fileName - File name for notifications
   * @param options - Undo configuration
   * @returns True if successful
   */
  public async undoMove(
    destinationPath: string,
    sourcePath: string,
    fileName: string,
    options: {
      showNotifications?: boolean;
    } = {}
  ): Promise<boolean> {
    const { showNotifications = false } = options;

    // Validate file exists at destination
    const file = this.validateFileExists(destinationPath);
    if (!file) {
      const error = `File not found at path: ${destinationPath}`;
      handleError(createError(error), 'undoMove', showNotifications);
      return false;
    }

    // Ensure source folder exists
    const sourceFolder = getParentPath(sourcePath);
    if (sourceFolder && !(await ensureFolderExists(this.app, sourceFolder))) {
      const error = `Failed to create source folder: ${sourceFolder}`;
      handleError(createError(error), 'undoMove', showNotifications);
      return false;
    }

    try {
      if (showNotifications) {
        NoticeManager.info(
          `Attempting to move ${fileName} from ${destinationPath} to ${sourcePath}`
        );
      }

      // Mark plugin move start
      this.markPluginMoveStart();

      try {
        // Perform the undo move
        await this.app.fileManager.renameFile(file, sourcePath);

        if (showNotifications) {
          NoticeManager.success(
            `Successfully moved ${fileName} back to ${sourcePath}`
          );
        }

        return true;
      } finally {
        // Always mark plugin move end
        this.markPluginMoveEnd();
      }
    } catch (error) {
      const errorMsg = `Error during undo operation for ${fileName}`;
      handleError(error, errorMsg, showNotifications);
      return false;
    }
  }

  /**
   * Undoes a move using a HistoryEntry object
   *
   * @param entry - HistoryEntry with paths
   * @param options - Same as undoMove()
   * @returns True if successful
   */
  public async undoMoveFromHistoryEntry(
    entry: HistoryEntry,
    options: {
      showNotifications?: boolean;
    } = {}
  ): Promise<boolean> {
    return this.undoMove(
      entry.destinationPath,
      entry.sourcePath,
      entry.fileName,
      options
    );
  }

  /**
   * Batch move multiple files with progress tracking
   *
   * @param operations - Array of {file, targetPath, originalPath?}
   * @param options - Batch configuration with optional progress callback
   * @returns Results with success/failure counts and errors
   */
  public async batchMoveFiles(
    operations: Array<{
      file: TFile;
      targetPath: string;
      originalPath?: string;
    }>,
    options: {
      trackInHistory?: boolean;
      showNotifications?: boolean;
      onProgress?: (
        completed: number,
        total: number,
        currentFile: string
      ) => void;
    } = {}
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const {
      trackInHistory = true,
      showNotifications = false,
      onProgress,
    } = options;

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      if (onProgress) {
        onProgress(i, operations.length, operation.file.name);
      }

      const success = await this.moveFile(
        operation.file,
        operation.targetPath,
        {
          trackInHistory,
          showNotifications: false, // Handle notifications at batch level
          originalPath: operation.originalPath,
        }
      );

      if (success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push(`Failed to move ${operation.file.name}`);
      }
    }

    if (showNotifications) {
      if (results.failed === 0) {
        NoticeManager.success(
          `Successfully moved ${results.successful} files!`
        );
      } else {
        NoticeManager.warning(
          `Moved ${results.successful} files with ${results.failed} errors.`
        );
      }
    }

    return results;
  }
}
