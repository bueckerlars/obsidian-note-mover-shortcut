import {
  HistoryEntry,
  BulkOperation,
  TimeFilter,
  RetentionPolicy,
  type AttachmentPathMove,
} from '../types/HistoryEntry';
import { TFile } from 'obsidian';
import AdvancedNoteMoverPlugin from 'main';
import { createError, handleError } from '../utils/Error';
import { fill, strings } from '../i18n/locale';
import { NoticeManager } from '../utils/NoticeManager';
import { HISTORY_CONSTANTS } from '../config/constants';
import { type OperationType } from '../types/Common';
import { getParentPath, ensureFolderExists } from '../utils/PathUtils';
import { debugWarn } from '../utils/debug';

export class HistoryManager {
  private history: HistoryEntry[] = [];
  private bulkOperations: BulkOperation[] = [];
  private isPluginMove = false; // Flag to detect internal plugin moves
  private currentBulkOperationId: string | null = null;
  private currentBulkOperationType: OperationType | null = null;

  constructor(private plugin: AdvancedNoteMoverPlugin) {}

  public loadHistoryFromSettings(): void {
    const historyData = this.plugin.pluginData.history;
    if (historyData && Array.isArray(historyData.history)) {
      this.history = historyData.history;
    } else {
      this.history = [];
    }

    if (historyData && Array.isArray(historyData.bulkOperations)) {
      this.bulkOperations = historyData.bulkOperations;
    } else {
      this.bulkOperations = [];
    }
  }

  private async saveHistory(): Promise<void> {
    if (
      !this.plugin.pluginData.history ||
      typeof this.plugin.pluginData.history !== 'object' ||
      Array.isArray(this.plugin.pluginData.history)
    ) {
      this.plugin.pluginData.history = { history: [], bulkOperations: [] };
    }

    if (!Array.isArray(this.plugin.pluginData.history.history)) {
      this.plugin.pluginData.history.history = [];
    }
    if (!Array.isArray(this.plugin.pluginData.history.bulkOperations)) {
      this.plugin.pluginData.history.bulkOperations = [];
    }

    this.plugin.pluginData.history.history = this.history;
    this.plugin.pluginData.history.bulkOperations = this.bulkOperations;
    await this.plugin.save_settings();
  }

  public addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    const timestamp = Date.now();
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp,
      bulkOperationId: this.currentBulkOperationId || undefined,
      operationType: this.currentBulkOperationType || 'single',
    };

    this.history.unshift(newEntry);

    // Add to current bulk operation if active
    if (this.currentBulkOperationId) {
      const bulkOp = this.bulkOperations.find(
        op => op.id === this.currentBulkOperationId
      );
      if (bulkOp) {
        bulkOp.entries.push(newEntry);
        bulkOp.totalFiles = bulkOp.entries.length;
      }
    }

    if (this.history.length > HISTORY_CONSTANTS.MAX_HISTORY_ENTRIES) {
      this.history.pop();
    }

    this.pruneExpired();
    void this.saveHistory();
  }

  /**
   * Marks the start of an internal plugin move
   */
  public markPluginMoveStart(): void {
    this.isPluginMove = true;
  }

  /**
   * Marks the end of an internal plugin move
   */
  public markPluginMoveEnd(): void {
    this.isPluginMove = false;
  }

  /** True while the plugin is performing a rename (suppress duplicate on-edit work). */
  public isPluginMoveInProgress(): boolean {
    return this.isPluginMove;
  }

  /** True during bulk or periodic vault-wide move loops. */
  public isBulkOperationInProgress(): boolean {
    return this.currentBulkOperationId !== null;
  }

  /**
   * Adds a history entry, but only if it's not an internal plugin move
   */
  public addEntryFromVaultEvent(
    sourcePath: string,
    destinationPath: string,
    fileName: string
  ): void {
    if (this.isPluginMove) {
      // Internal plugin move, skip
      return;
    }

    // Check if this is a real move (different folders)
    const sourceFolder = getParentPath(sourcePath);
    const destFolder = getParentPath(destinationPath);

    if (sourceFolder === destFolder) {
      // Only renaming, not moving
      return;
    }

    // Check if an entry for this file with the same destination already exists
    const existingEntry = this.history.find(
      entry =>
        entry.fileName === fileName &&
        entry.destinationPath === destinationPath &&
        Math.abs(Date.now() - entry.timestamp) <
          HISTORY_CONSTANTS.DUPLICATE_CHECK_WINDOW_MS // within one second
    );

    if (existingEntry) {
      // Duplicate entry, skip
      return;
    }

    this.addEntry({
      sourcePath,
      destinationPath,
      fileName,
    });
  }

  public getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get filtered history based on time filter
   */
  public getFilteredHistory(timeFilter: TimeFilter = 'all'): HistoryEntry[] {
    if (timeFilter === 'all') {
      return this.getHistory();
    }

    let cutoffTime: number;

    switch (timeFilter) {
      case 'today': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        cutoffTime = today.getTime();
        break;
      }
      case 'week': {
        const week = new Date();
        const dayOfWeek = week.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        week.setDate(week.getDate() - daysToMonday);
        week.setHours(0, 0, 0, 0);
        cutoffTime = week.getTime();
        break;
      }
      case 'month': {
        const month = new Date();
        month.setDate(1);
        month.setHours(0, 0, 0, 0);
        cutoffTime = month.getTime();
        break;
      }
      default:
        return this.getHistory();
    }

    return this.history.filter(entry => entry.timestamp >= cutoffTime);
  }

  /**
   * Get filtered bulk operations based on time filter
   */
  public getFilteredBulkOperations(
    timeFilter: TimeFilter = 'all'
  ): BulkOperation[] {
    if (timeFilter === 'all') {
      return this.getBulkOperations();
    }

    let cutoffTime: number;

    switch (timeFilter) {
      case 'today': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        cutoffTime = today.getTime();
        break;
      }
      case 'week': {
        const week = new Date();
        const dayOfWeek = week.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        week.setDate(week.getDate() - daysToMonday);
        week.setHours(0, 0, 0, 0);
        cutoffTime = week.getTime();
        break;
      }
      case 'month': {
        const month = new Date();
        month.setDate(1);
        month.setHours(0, 0, 0, 0);
        cutoffTime = month.getTime();
        break;
      }
      default:
        return this.getBulkOperations();
    }

    return this.bulkOperations.filter(op => op.timestamp >= cutoffTime);
  }

  /**
   * Clean up old history entries based on retention policy
   */
  public async cleanupOldEntries(silent = false): Promise<void> {
    const retentionPolicy =
      this.plugin.pluginData.settings?.retentionPolicy ||
      HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY;
    const { history, bulk } = this.pruneExpired();

    if (history > 0 || bulk > 0) {
      await this.saveHistory();
      if (!silent) {
        NoticeManager.info(
          fill(strings().notices.cleanedUp, {
            history,
            bulk,
            value: retentionPolicy.value,
            unit: retentionPolicy.unit,
          })
        );
      }
    }
  }

  /** Drops entries older than the retention policy (value 0 keeps everything). */
  private pruneExpired(): { history: number; bulk: number } {
    const retentionPolicy =
      this.plugin.pluginData.settings?.retentionPolicy ||
      HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY;
    if (retentionPolicy.value <= 0) {
      return { history: 0, bulk: 0 };
    }
    const cutoffTime = this.calculateRetentionCutoffTime(retentionPolicy);
    const oldHistoryCount = this.history.length;
    this.history = this.history.filter(entry => entry.timestamp >= cutoffTime);
    const oldBulkCount = this.bulkOperations.length;
    this.bulkOperations = this.bulkOperations.filter(
      op => op.timestamp >= cutoffTime
    );
    return {
      history: oldHistoryCount - this.history.length,
      bulk: oldBulkCount - this.bulkOperations.length,
    };
  }

  /**
   * Calculate cutoff time based on retention policy
   */
  private calculateRetentionCutoffTime(
    retentionPolicy: RetentionPolicy
  ): number {
    const now = Date.now();
    let millisecondsToSubtract: number;

    switch (retentionPolicy.unit) {
      case 'days':
        millisecondsToSubtract = retentionPolicy.value * 24 * 60 * 60 * 1000;
        break;
      case 'weeks':
        millisecondsToSubtract =
          retentionPolicy.value * 7 * 24 * 60 * 60 * 1000;
        break;
      case 'months':
        // Approximate months as 30 days
        millisecondsToSubtract =
          retentionPolicy.value * 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        millisecondsToSubtract = 30 * 24 * 60 * 60 * 1000; // Default to 30 days
    }

    return now - millisecondsToSubtract;
  }

  /**
   * Restores co-moved attachments to their original paths (reverse move order).
   */
  private async undoAttachmentMoves(
    attachmentMoves: AttachmentPathMove[] | undefined
  ): Promise<boolean> {
    if (!attachmentMoves?.length) {
      return true;
    }

    let allOk = true;
    const reversed = [...attachmentMoves].reverse();

    for (const move of reversed) {
      const file = this.plugin.app.vault.getAbstractFileByPath(
        move.destinationPath
      );
      if (!(file instanceof TFile)) {
        debugWarn(
          `[Advanced Note Mover] Attachment undo skipped; not found: ${move.destinationPath}`
        );
        allOk = false;
        continue;
      }

      const sourceFolder = getParentPath(move.sourcePath);
      if (
        sourceFolder &&
        !(await ensureFolderExists(this.plugin.app, sourceFolder))
      ) {
        allOk = false;
        continue;
      }

      try {
        await this.plugin.app.fileManager.renameFile(file, move.sourcePath);
      } catch (error) {
        handleError(
          error,
          `Error undoing attachment move for ${move.destinationPath}`,
          false
        );
        allOk = false;
      }
    }

    return allOk;
  }

  public async undoEntry(entryId: string): Promise<boolean> {
    const entryIndex = this.history.findIndex(entry => entry.id === entryId);
    if (entryIndex === -1) return false;

    const entry = this.history[entryIndex];
    if (entry.undone) return false;
    const file = this.plugin.app.vault.getAbstractFileByPath(
      entry.destinationPath
    );

    if (!file) {
      handleError(
        createError(`File not found at path: ${entry.destinationPath}`),
        'undoEntry',
        false
      );
      return false;
    }

    // Check if source folder exists, create if necessary
    const sourceFolderPath = getParentPath(entry.sourcePath);
    if (
      sourceFolderPath &&
      !(await ensureFolderExists(this.plugin.app, sourceFolderPath))
    ) {
      handleError(
        createError(`Failed to create source folder ${sourceFolderPath}`),
        'undoEntry',
        false
      );
      return false;
    }

    try {
      this.markPluginMoveStart();
      await this.plugin.app.fileManager.renameFile(file, entry.sourcePath);
      await this.undoAttachmentMoves(entry.attachmentMoves);

      this.markUndone([entry.id]);

      await this.saveHistory();
      return true;
    } catch (error) {
      handleError(error, 'Error during undo operation', false);
      return false;
    } finally {
      this.markPluginMoveEnd();
    }
  }

  public getLastEntryForFile(fileName: string): HistoryEntry | undefined {
    return this.history.find(
      entry => entry.fileName === fileName && !entry.undone
    );
  }

  /** Keeps undone moves in the history, flagged, so the list can still show them. */
  private markUndone(ids: Iterable<string>): void {
    const undone = new Set(ids);
    for (const entry of [
      ...this.history,
      ...this.bulkOperations.flatMap(op => op.entries),
    ]) {
      if (undone.has(entry.id)) entry.undone = true;
    }
  }

  public async undoLastMove(fileName: string): Promise<boolean> {
    const entry = this.getLastEntryForFile(fileName);
    if (!entry) {
      handleError(
        createError(`No history entry found for file: ${fileName}`),
        'undoLastMove',
        false
      );
      return false;
    }

    const file = this.plugin.app.vault.getAbstractFileByPath(
      entry.destinationPath
    );
    if (!file) {
      handleError(
        createError(`File not found at path: ${entry.destinationPath}`),
        'undoLastMove',
        false
      );
      return false;
    }

    // Check if source folder exists, create if necessary
    const sourceFolderPath = getParentPath(entry.sourcePath);
    if (
      sourceFolderPath &&
      !(await ensureFolderExists(this.plugin.app, sourceFolderPath))
    ) {
      handleError(
        createError(
          fill(strings().notices.failedToCreateSourceFolder, {
            folder: sourceFolderPath,
          })
        ),
        strings().notices.undoLastMoveContext,
        false
      );
      return false;
    }

    try {
      NoticeManager.info(
        fill(strings().notices.attemptingUndo, {
          from: entry.destinationPath,
          to: entry.sourcePath,
        })
      );
      this.markPluginMoveStart();
      await this.plugin.app.fileManager.renameFile(file, entry.sourcePath);
      await this.undoAttachmentMoves(entry.attachmentMoves);

      this.markUndone([entry.id]);
      await this.saveHistory();

      NoticeManager.success(strings().notices.moveSuccessful);
      return true;
    } catch (error) {
      handleError(error, strings().notices.errorDuringUndoContext, false);
      return false;
    } finally {
      this.markPluginMoveEnd();
    }
  }

  public async clearHistory(): Promise<void> {
    this.history = [];
    this.bulkOperations = [];
    await this.saveHistory();
  }

  /**
   * Starts a new bulk operation
   */
  public startBulkOperation(operationType: OperationType): string {
    const bulkOperationId = crypto.randomUUID();
    this.currentBulkOperationId = bulkOperationId;
    this.currentBulkOperationType = operationType;

    const bulkOp: BulkOperation = {
      id: bulkOperationId,
      operationType: operationType === 'single' ? 'bulk' : operationType,
      timestamp: Date.now(),
      entries: [],
      totalFiles: 0,
    };

    this.bulkOperations.unshift(bulkOp);

    // Limit bulk operations history
    if (this.bulkOperations.length > HISTORY_CONSTANTS.MAX_BULK_OPERATIONS) {
      this.bulkOperations.pop();
    }

    return bulkOperationId;
  }

  /**
   * Ends the current bulk operation
   */
  public endBulkOperation(): void {
    if (this.currentBulkOperationId) {
      const bulkOp = this.bulkOperations.find(
        op => op.id === this.currentBulkOperationId
      );
      if (bulkOp && bulkOp.entries.length === 0) {
        // Remove empty bulk operations
        const index = this.bulkOperations.indexOf(bulkOp);
        this.bulkOperations.splice(index, 1);
      }
    }

    this.currentBulkOperationId = null;
    this.currentBulkOperationType = null;
    void this.saveHistory();
  }

  /**
   * Gets all bulk operations
   */
  public getBulkOperations(): BulkOperation[] {
    return [...this.bulkOperations];
  }

  /**
   * Undoes an entire bulk operation
   */
  public async undoBulkOperation(
    bulkOperationId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const bulkOp = this.bulkOperations.find(op => op.id === bulkOperationId);
    if (!bulkOp) {
      return {
        success: false,
        errors: [`Bulk operation ${bulkOperationId} was not found`],
      };
    }

    const results: boolean[] = [];

    // Undo entries in reverse order (last moved files first)
    const sortedEntries = bulkOp.entries
      .filter(e => !e.undone)
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const entry of sortedEntries) {
      const file = this.plugin.app.vault.getAbstractFileByPath(
        entry.destinationPath
      );
      if (!file) {
        errors.push(
          `${entry.fileName} was not found at ${entry.destinationPath}`
        );
        results.push(false);
        continue;
      }

      // Check if source folder exists, create if necessary
      const sourceFolderPath = getParentPath(entry.sourcePath);
      if (
        sourceFolderPath &&
        !(await ensureFolderExists(this.plugin.app, sourceFolderPath))
      ) {
        errors.push(`Could not create folder ${sourceFolderPath}`);
        results.push(false);
        continue;
      }

      try {
        this.markPluginMoveStart();
        await this.plugin.app.fileManager.renameFile(file, entry.sourcePath);
        const attachmentsOk = await this.undoAttachmentMoves(
          entry.attachmentMoves
        );
        if (!attachmentsOk) {
          errors.push(`Could not move attachments for ${entry.fileName} back`);
        }
        results.push(attachmentsOk);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${entry.fileName}: ${message}`);
        results.push(false);
      } finally {
        this.markPluginMoveEnd();
      }
    }

    this.markUndone(
      sortedEntries.filter((_, index) => results[index]).map(e => e.id)
    );

    await this.saveHistory();

    return { success: results.every(r => r), errors };
  }
}
