import { TFile } from 'obsidian';
import { NoticeManager } from '../utils/NoticeManager';
import { viewIdle } from '../utils/viewTimers';
import { RuleManagerV2 } from './RuleManagerV2';
import { createError, handleError } from '../utils/Error';
import {
  combinePath,
  ensureFolderExists,
  folderExists,
} from '../utils/PathUtils';
import { deriveConflictInteractive } from '../utils/conflict-resolution-settings';
import {
  filterConflictSkipEntriesByExpectedTarget,
  normalizeConflictCachePath,
} from '../domain/conflicts/conflict-skip-cache';
import { runConfirmedBulkMove } from '../application/bulkMoveGuard';
import { executeNoteMoveWithConflictHandling } from '../application/execute-note-move-with-conflict';
import { persistConflictResolutionStrategy } from '../application/persist-conflict-resolution-strategy';
import { getAttachmentMoveSettings } from '../utils/attachment-settings';
import AdvancedNoteMoverPlugin from 'main';
import { type FileMoveResult, type OperationType } from '../types/Common';
import {
  fileMoveResultFromConflictOutcome,
  formatMoveSkippedDetail,
  isConflictSkipFileMoveOutcome,
  isMissingFolderSkipOutcome,
} from '../application/note-move-skip-outcome';
import { showSingleFileMoveNotice } from '../utils/single-file-move-notice';
import { MovePreview } from '../types/MovePreview';
import { ConfirmModal } from '../modals/ConfirmModal';
import { PreviewModal } from '../modals/PreviewModal';
import type { ConflictResolutionStrategy } from '../types/ConflictResolution';
import { NOTIFICATION_CONSTANTS } from '../config/constants';
import { fill, plural, strings } from '../i18n/locale';

const BULK_CHUNK_SIZE = 50;

const MOVE_NOTICE_DEDUPE_MS = 3000;

export class AdvancedNoteMover {
  private ruleManagerV2: RuleManagerV2;
  private readonly filesMoveInFlight = new Set<string>();
  private readonly lastMoveNoticeAtByFileName = new Map<string, number>();
  private periodicMoveInProgress = false;

  constructor(private plugin: AdvancedNoteMoverPlugin) {
    this.ruleManagerV2 = new RuleManagerV2(
      plugin.app,
      '/',
      plugin.performanceTrace
    );
    this.updateRuleManager();
  }

  public updateRuleManager(): void {
    const rulesV2 = Array.isArray(this.plugin.pluginData.settings.rulesV2)
      ? this.plugin.pluginData.settings.rulesV2
      : [];
    this.ruleManagerV2.setRules(rulesV2);
    this.ruleManagerV2.setFilter(
      this.plugin.pluginData.settings.filters.filter.map(f => f.value)
    );
    this.ruleManagerV2.setCreateMissingFolders(
      this.plugin.pluginData.settings.createMissingDestinationFolders !== false
    );

    this.plugin.syncRuleCacheHash();
  }

  /**
   * Drops skip-cache entries whose expected target no longer matches current rules.
   */
  public async invalidateConflictSkipCacheForRuleChange(): Promise<void> {
    const entries = this.plugin.conflictSkipCacheManager.getEntries();
    if (entries.length === 0) {
      return;
    }

    const expectedTargetBySource = new Map<string, string | null>();
    const uniqueSources = [
      ...new Set(
        entries.map(entry => normalizeConflictCachePath(entry.sourcePath))
      ),
    ];

    for (const sourcePath of uniqueSources) {
      const file = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
      if (!(file instanceof TFile)) {
        expectedTargetBySource.set(sourcePath, null);
        continue;
      }

      const moveResult = await this.ruleManagerV2.moveFileBasedOnTags(
        file,
        false
      );
      expectedTargetBySource.set(
        sourcePath,
        moveResult ? combinePath(moveResult.destination, file.name) : null
      );
    }

    const filtered = filterConflictSkipEntriesByExpectedTarget(
      entries,
      expectedTargetBySource
    );
    await this.plugin.conflictSkipCacheManager.replaceEntriesIfChanged(
      filtered
    );
  }

  public async addFileToBlacklist(fileName: string): Promise<void> {
    try {
      // Create filename filter
      const filterValue = `fileName: ${fileName}`;

      // Check if filter already exists
      if (
        this.plugin.pluginData.settings.filters.filter.some(
          f => f.value === filterValue
        )
      ) {
        NoticeManager.warning(
          fill(strings().notices.alreadyBlacklisted, { fileName })
        );
        return;
      }

      // Add filter to settings
      this.plugin.pluginData.settings.filters.filter.push({
        value: filterValue,
      });
      await this.plugin.save_settings();

      // Update RuleManager
      this.updateRuleManager();

      NoticeManager.success(
        fill(strings().notices.addedToBlacklist, { fileName })
      );
    } catch (error) {
      NoticeManager.error(
        fill(strings().notices.errorAddingToBlacklist, {
          message: error instanceof Error ? error.message : String(error),
        })
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
    skipFilter = false,
    options: {
      bypassConflictSkipCache?: boolean;
    } = {}
  ): Promise<FileMoveResult> {
    const bypassConflictSkipCache = options.bypassConflictSkipCache ?? false;
    const interactive = deriveConflictInteractive(
      this.plugin.pluginData.settings,
      bypassConflictSkipCache
    );
    return this.plugin.performanceTrace.recordAsync(
      'AdvancedNoteMover.moveFileBasedOnTags',
      async () => {
        const { app } = this.plugin;
        const cache = this.plugin.ruleCache;
        const cacheEnabled =
          this.plugin.pluginData.settings.enableRuleEvaluationCache !== false;
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

          const result = await this.ruleManagerV2.moveFileBasedOnTags(
            file,
            skipFilter
          );

          if (cacheEnabled) {
            cache.store(originalPath, mtime, result?.destination ?? null);
          }

          if (result === null) {
            return this.finishFileMove(originalPath, file, { moved: false });
          }
          targetFolder = result.destination;

          const newPath = combinePath(targetFolder, file.name);

          if (originalPath === newPath) {
            return this.finishFileMove(originalPath, file, { moved: false });
          }

          // When folder auto-creation is disabled (globally or per rule), skip
          // the move if the destination folder does not exist yet.
          if (
            !result.createFolder &&
            !(await folderExists(app, targetFolder))
          ) {
            this.maybeNotifyMissingFolder(file, targetFolder);
            return this.finishFileMove(originalPath, file, {
              moved: false,
              skipReason: 'missing_destination_folder',
            });
          }

          if (!(await ensureFolderExists(app, targetFolder))) {
            throw createError(
              fill(strings().notices.failedToCreateFolder, {
                folder: targetFolder,
              })
            );
          }

          const moveOutcome = await executeNoteMoveWithConflictHandling({
            app,
            settings: this.plugin.pluginData.settings,
            historyManager: this.plugin.historyManager,
            conflictSkipCache: this.plugin.conflictSkipCacheManager,
            file,
            originalPath,
            targetFolder,
            attachmentSettings: getAttachmentMoveSettings(
              this.plugin.pluginData.settings
            ),
            interactive,
            bypassConflictSkipCache,
            ruleName: result.ruleName,
            onPersistStrategy: async (strategy: ConflictResolutionStrategy) => {
              await persistConflictResolutionStrategy(this.plugin, strategy);
            },
          });

          if (!moveOutcome.moved) {
            return this.finishFileMove(
              originalPath,
              file,
              fileMoveResultFromConflictOutcome(moveOutcome)
            );
          }

          const moveResult = {
            moved: true,
            targetFolder: moveOutcome.targetFolder,
          } as const;
          this.maybeNotifySingleFileMove(file, moveOutcome.targetFolder);
          return this.finishFileMove(originalPath, file, moveResult);
        } catch (error) {
          handleError(
            error,
            fill(strings().notices.errorMovingFile, { path: file.path })
          );
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
            NoticeManager.info(strings().notices.noMovableFiles);
          }
          return;
        }

        // Start bulk operation
        const bulkOperationId = this.plugin.historyManager.startBulkOperation(
          options.operationType
        );
        let successCount = 0;
        let errorCount = 0;
        const moveErrors: string[] = [];
        let missingFolderSkippedCount = 0;
        let conflictSkippedCount = 0;

        if (options.operationType === 'periodic') {
          await this.plugin.conflictSkipCacheManager.prune(app);
        }

        try {
          for (let i = 0; i < files.length; i++) {
            if (options.signal?.aborted) {
              break;
            }
            try {
              const moveResult = await this.moveFileBasedOnTags(
                files[i],
                '/',
                false,
                { bypassConflictSkipCache: false }
              );
              if (moveResult.moved) {
                successCount++;
              } else if (isMissingFolderSkipOutcome(moveResult)) {
                missingFolderSkippedCount++;
              } else if (isConflictSkipFileMoveOutcome(moveResult)) {
                conflictSkippedCount++;
              }
            } catch (error) {
              errorCount++;
              const message =
                error instanceof Error ? error.message : String(error);
              moveErrors.push(`${files[i].path}: ${message}`);
            }
            // Yield to the UI thread periodically to prevent freezing
            if ((i + 1) % BULK_CHUNK_SIZE === 0 && i + 1 < files.length) {
              await new Promise<void>(resolve => {
                viewIdle(resolve, 250);
              });
            }
          }

          const skippedDetail = formatMoveSkippedDetail({
            missingFolder: missingFolderSkippedCount,
            conflict: conflictSkippedCount,
          });
          const hasSkipOrError =
            missingFolderSkippedCount > 0 ||
            conflictSkippedCount > 0 ||
            errorCount > 0;

          // Show completion notice when anything happened worth reporting
          if (
            options.showNotifications &&
            (successCount > 0 || hasSkipOrError)
          ) {
            if (options.operationType === 'bulk') {
              if (successCount > 0) {
                const totalAttempted = successCount + errorCount;
                const successMessage =
                  errorCount > 0
                    ? fill(strings().notices.movedOf, {
                        moved: plural(successCount, 'file'),
                        attempted: totalAttempted,
                        errors: plural(errorCount, 'file'),
                      })
                    : fill(strings().notices.successfullyMoved, {
                        moved: plural(successCount, 'file'),
                      });

                NoticeManager.showWithUndo(
                  'info',
                  fill(strings().notices.bulkOperation, {
                    message: `${successMessage}${skippedDetail}`,
                  }),
                  () => {
                    void (async () => {
                      const undone =
                        await this.plugin.historyManager.undoBulkOperation(
                          bulkOperationId
                        );
                      if (undone.success) {
                        NoticeManager.success(
                          fill(strings().notices.bulkUndone, {
                            moved: plural(successCount, 'file'),
                          }),
                          { duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE }
                        );
                      } else {
                        NoticeManager.warning(
                          undone.errors.length === 1
                            ? undone.errors[0]
                            : fill(strings().notices.errorsWhileUndoing, {
                                errors: plural(undone.errors.length, 'error'),
                              }),
                          {
                            duration: NOTIFICATION_CONSTANTS.DURATION_OVERRIDE,
                            detailText: strings().common.showDetails,
                            onDetail:
                              undone.errors.length > 1
                                ? () => {
                                    NoticeManager.error(
                                      undone.errors.join('; ')
                                    );
                                  }
                                : undefined,
                          }
                        );
                      }
                    })();
                  },
                  strings().modals.historyUndoAll,
                  moveErrors.length > 0
                    ? {
                        detailText: strings().common.showDetails,
                        onDetail: () => {
                          NoticeManager.error(moveErrors.join('; '));
                        },
                      }
                    : undefined
                );
              } else {
                NoticeManager.info(
                  fill(strings().notices.bulkNoneMoved, {
                    skipped: skippedDetail,
                  }),
                  moveErrors.length > 0
                    ? {
                        detailText: strings().common.showDetails,
                        onDetail: () => {
                          NoticeManager.error(moveErrors.join('; '));
                        },
                      }
                    : undefined
                );
              }
            } else {
              const periodicMessage =
                successCount > 0
                  ? fill(strings().notices.periodicMoved, {
                      moved: plural(successCount, 'file'),
                      skipped: skippedDetail,
                    })
                  : fill(strings().notices.periodicNone, {
                      skipped: skippedDetail,
                    });
              NoticeManager.info(
                errorCount > 0
                  ? fill(strings().notices.withErrorCount, {
                      message: periodicMessage,
                      errors: plural(errorCount, 'error'),
                    })
                  : periodicMessage,
                moveErrors.length > 0
                  ? {
                      detailText: strings().common.showDetails,
                      onDetail: () => {
                        NoticeManager.error(moveErrors.join('; '));
                      },
                    }
                  : undefined
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
    let preview;
    try {
      preview = await this.generateVaultMovePreview(opts?.signal);
    } catch (error) {
      handleError(
        error,
        strings().notices.errorGeneratingVaultPreviewContext,
        false
      );
      return;
    }

    const previewed = preview.successfulMoves
      .filter(entry => entry.willBeMoved && entry.targetPath)
      .map(entry => ({ path: entry.currentPath }));

    if (previewed.length === 0) {
      NoticeManager.info(
        preview.totalFiles === 0
          ? strings().notices.noMovableFiles
          : strings().notices.bulkMoveNone
      );
      return;
    }

    let started = false;
    let moved = 0;
    let index = 0;
    try {
      await runConfirmedBulkMove({
        previewed,
        undoHint: strings().modals.bulkMoveUndo,
        confirm: prompt =>
          ConfirmModal.show(this.plugin.app, {
            title: strings().modals.bulkMoveTitle,
            message: fill(strings().modals.bulkMoveMessage, {
              count: plural(prompt.count, 'file'),
            }),
            details: [...prompt.paths, prompt.undoHint],
            confirmText: strings().modals.bulkMoveConfirm,
            cancelText: strings().common.cancel,
          }),
        renameFile: async file => {
          if (!started) {
            this.plugin.historyManager.startBulkOperation('bulk');
            started = true;
          }
          const vaultFile = this.plugin.app.vault.getAbstractFileByPath(
            file.path
          );
          if (!(vaultFile instanceof TFile)) {
            return;
          }
          const result = await this.moveFileBasedOnTags(vaultFile, '/', false, {
            bypassConflictSkipCache: false,
          });
          if (result.moved) {
            moved += 1;
          }
          index += 1;
          if (index % BULK_CHUNK_SIZE === 0 && index < previewed.length) {
            await new Promise<void>(resolve => {
              viewIdle(resolve, 250);
            });
          }
        },
      });
    } finally {
      if (started) {
        this.plugin.historyManager.endBulkOperation();
        NoticeManager.info(
          moved > 0
            ? fill(strings().notices.successfullyMoved, {
                moved: plural(moved, 'file'),
              })
            : fill(strings().notices.bulkNoneMoved, { skipped: '' })
        );
      }
    }
  }

  /**
   * Periodic version of bulk move - same logic but marked as periodic operation
   */
  async moveAllFilesInVaultPeriodic() {
    if (this.periodicMoveInProgress) {
      return;
    }
    this.periodicMoveInProgress = true;
    try {
      await this.moveAllFiles({
        createFolders: false,
        showNotifications: true,
        operationType: 'periodic',
      });
    } finally {
      this.periodicMoveInProgress = false;
    }
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
      await this.moveFileBasedOnTags(file, '/', false, {
        bypassConflictSkipCache: true,
      });
    } catch (error) {
      handleError(error, strings().notices.moveFocusedContext, false);
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

  private maybeNotifyMissingFolder(file: TFile, targetFolder: string): void {
    // Suppress per-file notices during bulk operations to avoid spam; the bulk
    // completion notice already summarizes how many files were moved.
    if (this.plugin.historyManager.isBulkOperationInProgress()) {
      return;
    }

    const now = Date.now();
    const lastAt = this.lastMoveNoticeAtByFileName.get(file.name);
    if (lastAt !== undefined && now - lastAt < MOVE_NOTICE_DEDUPE_MS) {
      return;
    }
    this.lastMoveNoticeAtByFileName.set(file.name, now);
    NoticeManager.warning(
      fill(strings().notices.missingFolder, {
        fileName: file.name,
        folder: targetFolder,
      })
    );
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
  /** Opens the bulk preview for every movable note. */
  openVaultMovePreview(): void {
    new PreviewModal(this.plugin.app, this.plugin, null, {
      load: (signal, onProgress) =>
        this.generateVaultMovePreview(signal, onProgress),
    }).open();
  }

  async openVaultReEvaluationPreview(): Promise<void> {
    this.updateRuleManager();
    this.plugin.ruleCache.invalidateAll();
    new PreviewModal(this.plugin.app, this.plugin, null, {
      title: strings().modals.previewReEvaluateTitle,
      load: (signal, onProgress) =>
        this.generateVaultMovePreview(signal, onProgress),
    }).open();
  }

  /**
   * Generates a preview of moves for all files in the vault
   */
  async generateVaultMovePreview(
    signal?: AbortSignal,
    onProgress?: (completed: number, total: number) => void
  ): Promise<MovePreview> {
    return this.plugin.performanceTrace.recordAsync(
      'AdvancedNoteMover.generateVaultMovePreview',
      async () => {
        const { app } = this.plugin;

        const files = this.plugin.vaultIndexCache.getMovableFilesCached(app);

        return await this.ruleManagerV2.generateMovePreview(files, true, true, {
          signal,
          onProgress,
        });
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
