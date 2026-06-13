import { TFile } from 'obsidian';
import { NoticeManager } from '../utils/NoticeManager';
import { RuleManagerV2 } from './RuleManagerV2';
import { createError, handleError } from '../utils/Error';
import { combinePath, ensureFolderExists } from '../utils/PathUtils';
import { performNoteMove } from '../application/perform-note-move';
import { getAttachmentMoveSettings } from '../utils/attachment-settings';
import AdvancedNoteMoverPlugin from 'main';
import { type FileMoveResult, type OperationType } from '../types/Common';
import { showSingleFileMoveNotice } from '../utils/single-file-move-notice';
import { MovePreview } from '../types/MovePreview';
import { PreviewModal } from '../modals/PreviewModal';
import {
  SETTINGS_CONSTANTS,
  NOTIFICATION_CONSTANTS,
} from '../config/constants';

const BULK_CHUNK_SIZE = 50;

const MOVE_NOTICE_DEDUPE_MS = 3000;

export class AdvancedNoteMover {
  private ruleManagerV2: RuleManagerV2;
  private readonly filesMoveInFlight = new Set<string>();
  private readonly lastMoveNoticeAtByFileName = new Map<string, number>();

  constructor(private plugin: AdvancedNoteMoverPlugin) {
    this.ruleManagerV2 = new RuleManagerV2(
      plugin.app,
      '/',
      plugin.performanceTrace
    );
    this.updateRuleManager();
  }

  public updateRuleManager(): void {
    const rulesV2 = Array.isArray(this.plugin.settings.settings.rulesV2)
      ? this.plugin.settings.settings.rulesV2
      : [];
    this.ruleManagerV2.setRules(rulesV2);
    this.ruleManagerV2.setFilter(
      this.plugin.settings.settings.filters.filter.map(f => f.value)
    );

    this.plugin.syncRuleCacheHash();
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
  ): Promise<FileMoveResult> {
    return this.plugin.performanceTrace.recordAsync(
      'AdvancedNoteMover.moveFileBasedOnTags',
      async () => {
        const { app } = this.plugin;
        const cache = this.plugin.ruleCache;
        const cacheEnabled =
          this.plugin.settings.settings.enableRuleEvaluationCache !== false;
        const originalPath = file.path;
        const mtime = file.stat?.mtime ?? 0;

        if (this.filesMoveInFlight.has(originalPath)) {
          return { moved: false };
        }
        this.filesMoveInFlight.add(originalPath);

        // Fast path: if the cache is enabled and already knows the result for
        // this file, skip the expensive rule evaluation entirely.
        if (cacheEnabled && !cache.needsEvaluation(originalPath, mtime)) {
          const cachedDest = cache.getCachedDestination(originalPath);
          if (cachedDest === null || cachedDest === undefined) {
            return this.finishFileMove(originalPath, file, { moved: false });
          }
          const cachedPath = combinePath(cachedDest, file.name);
          if (originalPath === cachedPath) {
            return this.finishFileMove(originalPath, file, { moved: false });
          }
        }

        try {
          let targetFolder = defaultFolder;

          let result: string | null = null;

          result = await this.ruleManagerV2.moveFileBasedOnTags(
            file,
            skipFilter
          );

          if (cacheEnabled) {
            cache.store(originalPath, mtime, result);
          }

          if (result === null) {
            return this.finishFileMove(originalPath, file, { moved: false });
          }
          targetFolder = result;

          const newPath = combinePath(targetFolder, file.name);

          if (originalPath === newPath) {
            return this.finishFileMove(originalPath, file, { moved: false });
          }

          if (!(await ensureFolderExists(app, targetFolder))) {
            throw createError(
              `Failed to create target folder: ${targetFolder}`
            );
          }

          await performNoteMove({
            app,
            historyManager: this.plugin.historyManager,
            file,
            originalPath,
            newPath,
            attachmentSettings: getAttachmentMoveSettings(
              this.plugin.settings.settings
            ),
          });

          const moveResult = { moved: true, targetFolder } as const;
          this.maybeNotifySingleFileMove(file, targetFolder);
          return this.finishFileMove(originalPath, file, moveResult);
        } catch (error) {
          handleError(error, `Error moving file '${file.path}'`);
          return this.finishFileMove(originalPath, file, { moved: false });
        }
      },
      { path: file.path, skipFilter }
    );
  }

  private async moveAllFiles(options: {
    createFolders: boolean;
    showNotifications: boolean;
    operationType: OperationType;
    signal?: AbortSignal;
  }): Promise<void> {
    await this.plugin.performanceTrace.recordAsync(
      'AdvancedNoteMover.moveAllFiles',
      async () => {
        const { app } = this.plugin;

        const files = this.plugin.vaultIndexCache.getMovableFilesCached(app);

        if (files.length === 0) {
          if (options.showNotifications && options.operationType === 'bulk') {
            NoticeManager.info('No movable files found in vault');
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
          for (let i = 0; i < files.length; i++) {
            if (options.signal?.aborted) {
              break;
            }
            try {
              const moveResult = await this.moveFileBasedOnTags(files[i], '/');
              if (moveResult.moved) {
                successCount++;
              }
            } catch (error) {
              errorCount++;
              const errorMessage =
                options.operationType === 'periodic'
                  ? `Error moving file '${files[i].path}' during periodic movement`
                  : `Error moving file '${files[i].path}'`;
              handleError(error, errorMessage, false);
            }
            // Yield to the UI thread periodically to prevent freezing
            if ((i + 1) % BULK_CHUNK_SIZE === 0 && i + 1 < files.length) {
              await new Promise<void>(resolve => {
                const ric = window.requestIdleCallback;
                if (typeof ric === 'function') {
                  ric(() => resolve(), { timeout: 250 });
                } else {
                  window.setTimeout(resolve, 0);
                }
              });
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
                () => {
                  void (async () => {
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
                  })();
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
      },
      { operationType: options.operationType }
    );
  }

  async moveAllFilesInVault(opts?: { signal?: AbortSignal }) {
    await this.moveAllFiles({
      createFolders: true,
      showNotifications: true,
      operationType: 'bulk',
      signal: opts?.signal,
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
      await this.moveFileBasedOnTags(file, '/', false);
    } catch (error) {
      handleError(error, 'moveFocusedNoteToDestination', false);
      return;
    }
  }

  private finishFileMove(
    originalPath: string,
    file: TFile,
    result: FileMoveResult
  ): FileMoveResult {
    this.filesMoveInFlight.delete(originalPath);
    this.filesMoveInFlight.delete(file.path);
    return result;
  }

  private maybeNotifySingleFileMove(file: TFile, targetFolder: string): void {
    if (this.plugin.historyManager.isBulkOperationInProgress()) {
      return;
    }

    const now = Date.now();
    const lastAt = this.lastMoveNoticeAtByFileName.get(file.name);
    if (lastAt !== undefined && now - lastAt < MOVE_NOTICE_DEDUPE_MS) {
      return;
    }
    this.lastMoveNoticeAtByFileName.set(file.name, now);
    showSingleFileMoveNotice(file, targetFolder);
  }

  /**
   * Re-evaluate the vault with current rules: sync rule manager, invalidate cache,
   * then open a preview modal before any files are moved.
   */
  async openVaultReEvaluationPreview(): Promise<void> {
    this.updateRuleManager();
    this.plugin.ruleCache.invalidateAll();
    const preview = await this.generateVaultMovePreview();
    new PreviewModal(this.plugin.app, this.plugin, preview, {
      title: 'Re-evaluate vault',
    }).open();
  }

  /**
   * Generates a preview of moves for all files in the vault
   */
  async generateVaultMovePreview(): Promise<MovePreview> {
    return this.plugin.performanceTrace.recordAsync(
      'AdvancedNoteMover.generateVaultMovePreview',
      async () => {
        const { app } = this.plugin;

        const files = this.plugin.vaultIndexCache.getMovableFilesCached(app);

        return await this.ruleManagerV2.generateMovePreview(files, true, true);
      },
      {}
    );
  }

  /**
   * Generates a preview for the currently active note
   */
  async generateActiveNotePreview(): Promise<MovePreview | null> {
    return this.plugin.performanceTrace.recordAsync(
      'AdvancedNoteMover.generateActiveNotePreview',
      async () => {
        const { app } = this.plugin;
        const activeFile = app.workspace.getActiveFile();

        if (!activeFile) {
          return null;
        }

        return await this.ruleManagerV2.generateMovePreview(
          [activeFile],
          true,
          true
        );
      },
      {}
    );
  }
}
