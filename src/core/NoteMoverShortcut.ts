import { TFile } from 'obsidian';
import { NoticeManager } from '../utils/NoticeManager';
import { RuleManager } from './RuleManager';
import { RuleManagerV2 } from './RuleManagerV2';
import { createError, handleError } from '../utils/Error';
import { combinePath, ensureFolderExists } from '../utils/PathUtils';
import NoteMoverShortcutPlugin from 'main';
import { type OperationType } from '../types/Common';
import { MovePreview } from '../types/MovePreview';
import {
  SETTINGS_CONSTANTS,
  NOTIFICATION_CONSTANTS,
} from '../config/constants';

export class NoteMoverShortcut {
  private ruleManager: RuleManager;
  private ruleManagerV2: RuleManagerV2;

  constructor(private plugin: NoteMoverShortcutPlugin) {
    this.ruleManager = new RuleManager(plugin.app, '/');
    this.ruleManagerV2 = new RuleManagerV2(plugin.app, '/');
    this.updateRuleManager();
  }

  public updateRuleManager(): void {
    // Choose which rule manager to use based on feature flag
    if (this.plugin.settings.settings.enableRuleV2 === true) {
      // Use RuleV2 - always update, even if rulesV2 is empty or undefined
      const rulesV2 = Array.isArray(this.plugin.settings.settings.rulesV2)
        ? this.plugin.settings.settings.rulesV2
        : [];
      this.ruleManagerV2.setRules(rulesV2);
      this.ruleManagerV2.setFilter(
        this.plugin.settings.settings.filters.filter.map(f => f.value)
      );
    } else {
      // Use RuleV1 (deprecated)
      this.ruleManager.setRules(this.plugin.settings.settings.rules);
      this.ruleManager.setFilter(
        this.plugin.settings.settings.filters.filter.map(f => f.value)
      );
    }
  }

  public async addFileToBlacklist(fileName: string): Promise<void> {
    try {
      // Create filename filter
      const filterValue = `fileName: ${fileName}`;

      // Check if filter already exists
      if (
        this.plugin.settings.settings.filters.filter.some(
          f => f.value === filterValue
        )
      ) {
        NoticeManager.warning(
          `File "${fileName}" is already in the blacklist.`
        );
        return;
      }

      // Add filter to settings
      this.plugin.settings.settings.filters.filter.push({ value: filterValue });
      await this.plugin.save_settings();

      // Update RuleManager
      this.updateRuleManager();

      NoticeManager.success(`File "${fileName}" added to blacklist.`);
    } catch (error) {
      NoticeManager.error(
        `Error adding file to blacklist: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async setup(): Promise<void> {
    // Periodic setup moved to TriggerEventHandler
  }

  /**
   * Moves a single file based on its tags and rules
   *
   * This method processes ONLY the specified file, not the entire vault.
   * It's optimized for single-file operations like onEdit triggers.
   *
   * @param file - The specific TFile to process and potentially move
   * @param defaultFolder - Default folder if no rule matches
   * @param skipFilter - Whether to skip filter evaluation
   */
  public async moveFileBasedOnTags(
    file: TFile,
    defaultFolder: string,
    skipFilter = false
  ): Promise<void> {
    const { app } = this.plugin;
    const originalPath = file.path;

    try {
      let targetFolder = defaultFolder;

      // Always use rules and filters (no toggle check)
      let result: string | null = null;

      // Choose rule manager based on feature flag
      if (this.plugin.settings.settings.enableRuleV2 === true) {
        result = await this.ruleManagerV2.moveFileBasedOnTags(file, skipFilter);
      } else {
        result = await this.ruleManager.moveFileBasedOnTags(file, skipFilter);
      }

      if (result === null) {
        return; // File should be skipped based on filter or no matching rule
      }
      targetFolder = result;

      const newPath = combinePath(targetFolder, file.name);

      // Skip if file is already in the correct location
      if (originalPath === newPath) {
        return; // File is already in the correct folder, no need to move
      }

      // Ensure target folder exists before moving the file
      if (!(await ensureFolderExists(app, targetFolder))) {
        throw createError(`Failed to create target folder: ${targetFolder}`);
      }

      // Markiere Plugin-interne Verschiebung
      this.plugin.historyManager.markPluginMoveStart();

      try {
        // Move file to new path
        await app.fileManager.renameFile(file, newPath);

        // Add entry to history
        this.plugin.historyManager.addEntry({
          sourcePath: originalPath,
          destinationPath: newPath,
          fileName: file.name,
        });
      } finally {
        // End internal plugin move (even on errors)
        this.plugin.historyManager.markPluginMoveEnd();
      }
    } catch (error) {
      handleError(error, `Error moving file '${file.path}'`);
    }
  }

  private async moveAllFiles(options: {
    createFolders: boolean;
    showNotifications: boolean;
    operationType: OperationType;
  }): Promise<void> {
    const { app } = this.plugin;

    // Get all files in the vault
    const files = await app.vault.getFiles();

    if (files.length === 0) {
      // Only show notice for manual/bulk runs, stay silent for periodic runs
      if (options.showNotifications && options.operationType === 'bulk') {
        NoticeManager.info('No files found in vault');
      }
      return;
    }

    // Start bulk operation
    const bulkOperationId = this.plugin.historyManager.startBulkOperation(
      options.operationType
    );
    let successCount = 0;
    let errorCount = 0;

    try {
      // Iterate over each file and move it
      for (const file of files) {
        try {
          await this.moveFileBasedOnTags(file, '/');
          successCount++;
        } catch (error) {
          errorCount++;
          const errorMessage =
            options.operationType === 'periodic'
              ? `Error moving file '${file.path}' during periodic movement`
              : `Error moving file '${file.path}'`;
          handleError(error, errorMessage, false);
        }
      }

      // Show completion notice
      if (successCount > 0 && options.showNotifications) {
        if (options.operationType === 'bulk') {
          const totalFiles = successCount + errorCount;
          const successMessage =
            errorCount > 0
              ? `Moved ${successCount}/${totalFiles} files. ${errorCount} files had errors.`
              : `Successfully moved ${successCount} files`;

          NoticeManager.showWithUndo(
            'info',
            `Bulk Operation: ${successMessage}`,
            async () => {
              const success =
                await this.plugin.historyManager.undoBulkOperation(
                  bulkOperationId
                );
              if (success) {
                NoticeManager.success(
                  `Bulk operation undone: ${successCount} files moved back`,
                  { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
                );
              } else {
                NoticeManager.warning(
                  `Could not undo all moves. Check individual files in history.`,
                  { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
                );
              }
            },
            SETTINGS_CONSTANTS.UI_TEXTS.UNDO_ALL
          );
        } else {
          NoticeManager.info(
            `Periodic movement: Successfully moved ${successCount} files`
          );
        }
      }
    } finally {
      // End bulk operation
      this.plugin.historyManager.endBulkOperation();
    }
  }

  async moveAllFilesInVault() {
    await this.moveAllFiles({
      createFolders: true,
      showNotifications: true,
      operationType: 'bulk',
    });
  }

  /**
   * Periodic version of bulk move - same logic but marked as periodic operation
   */
  async moveAllFilesInVaultPeriodic() {
    await this.moveAllFiles({
      createFolders: false,
      showNotifications: true,
      operationType: 'periodic',
    });
  }

  async moveFocusedNoteToDestination() {
    const { app } = this.plugin;
    const file = app.workspace.getActiveFile();

    if (!file) {
      handleError(
        createError('No file is open'),
        'moveFocusedNoteToDestination',
        false
      );
      return;
    }

    try {
      // Move file using rules and filters
      await this.moveFileBasedOnTags(file, '/', false);

      // Create notice with undo button
      NoticeManager.showWithUndo(
        'info',
        `Note "${file.name}" has been moved`,
        async () => {
          try {
            NoticeManager.info(
              `Attempting to undo move for file: ${file.name}`
            );
            const success = await this.plugin.historyManager.undoLastMove(
              file.name
            );
            if (success) {
              NoticeManager.success(`Note "${file.name}" has been moved back`, {
                duration: 3000,
              });
            } else {
              NoticeManager.warning(`Could not undo move for "${file.name}"`, {
                duration: 3000,
              });
            }
          } catch (error) {
            handleError(error, 'Error in undo button click handler', false);
          }
        },
        'Undo'
      );
    } catch (error) {
      handleError(error, 'moveFocusedNoteToDestination', false);
      return;
    }
  }

  /**
   * Generates a preview of moves for all files in the vault
   */
  async generateVaultMovePreview(): Promise<MovePreview> {
    const { app } = this.plugin;

    // Get all files in the vault
    const files = await app.vault.getFiles();

    // Choose rule manager based on feature flag
    if (this.plugin.settings.settings.enableRuleV2 === true) {
      return await this.ruleManagerV2.generateMovePreview(
        files,
        true, // Rules are always enabled
        true // Filter is always enabled
      );
    } else {
      return await this.ruleManager.generateMovePreview(
        files,
        true, // Rules are always enabled
        true // Filter is always enabled
      );
    }
  }

  /**
   * Generates a preview for the currently active note
   */
  async generateActiveNotePreview(): Promise<MovePreview | null> {
    const { app } = this.plugin;
    const activeFile = app.workspace.getActiveFile();

    if (!activeFile) {
      return null;
    }

    // Choose rule manager based on feature flag
    if (this.plugin.settings.settings.enableRuleV2 === true) {
      return await this.ruleManagerV2.generateMovePreview(
        [activeFile],
        true, // Rules are always enabled
        true // Filter is always enabled
      );
    } else {
      return await this.ruleManager.generateMovePreview(
        [activeFile],
        true, // Rules are always enabled
        true // Filter is always enabled
      );
    }
  }
}
