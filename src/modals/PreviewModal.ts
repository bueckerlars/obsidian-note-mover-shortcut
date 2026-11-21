import { Setting, App, TFile, setIcon } from 'obsidian';
import { fill, strings } from '../i18n/locale';
import { MovePreview, PreviewEntry } from '../types/MovePreview';
import AdvancedNoteMoverPlugin from 'main';
import { NoticeManager } from '../utils/NoticeManager';
import { pluralize } from '../utils/pluralize';
import { viewIdle } from '../utils/viewTimers';
import { MobileUtils } from '../utils/MobileUtils';
import {
  combinePath,
  ensureFolderExists,
  folderExists,
} from '../utils/PathUtils';
import { createError } from '../utils/Error';
import {
  formatMoveSkippedDetail,
  isNoteMoveConflictSkipOutcome,
} from '../application/note-move-skip-outcome';
import { executeNoteMoveWithConflictHandling } from '../application/execute-note-move-with-conflict';
import { persistConflictResolutionStrategy } from '../application/persist-conflict-resolution-strategy';
import { getAttachmentMoveSettings } from '../utils/attachment-settings';
import type { ConflictResolutionStrategy } from '../types/ConflictResolution';
import { deriveConflictInteractive } from '../utils/conflict-resolution-settings';
import { previewRowLabel } from '../domain/preview/previewReasons';
import { BaseModal, BaseModalOptions } from './BaseModal';

type PreviewLoader = (
  signal: AbortSignal,
  onProgress: (completed: number, total: number) => void
) => Promise<MovePreview>;

const EMPTY_PREVIEW: MovePreview = {
  successfulMoves: [],
  analyzed: [],
  totalFiles: 0,
  settings: { isFilterWhitelist: false },
};

export class PreviewModal extends BaseModal {
  private movePreview: MovePreview;
  private actionFooterEl: HTMLElement | null = null;
  private moveButton: HTMLButtonElement | null = null;
  private readingEl: HTMLElement | null = null;
  private operationAbort: AbortController | null = null;
  private previewReady: boolean;
  private readonly loadPreview: PreviewLoader | undefined;
  private readonly selectedPaths = new Set<string>();

  constructor(
    app: App,
    private plugin: AdvancedNoteMoverPlugin,
    movePreview: MovePreview | null,
    options: BaseModalOptions & { load?: PreviewLoader } = {}
  ) {
    const { load, ...modalOptions } = options;
    super(app, {
      title: strings().modals.previewTitle,
      titleIcon: 'search',
      cssClass: 'advancedNoteMover-preview-modal',
      size: 'large',
      ...modalOptions,
    });
    this.loadPreview = load;
    this.previewReady = movePreview != null;
    this.movePreview = movePreview ?? EMPTY_PREVIEW;
    this.selectSuccessful(this.movePreview);
  }

  private selectSuccessful(preview: MovePreview): void {
    this.selectedPaths.clear();
    for (const entry of preview.successfulMoves) {
      this.selectedPaths.add(entry.currentPath);
    }
  }

  private beginOperation(): AbortController {
    this.operationAbort?.abort();
    const controller = new AbortController();
    this.operationAbort = controller;
    return controller;
  }

  onClose(): void {
    this.operationAbort?.abort();
    super.onClose();
  }

  private selectedEntries(): PreviewEntry[] {
    return this.movePreview.successfulMoves.filter(entry =>
      this.selectedPaths.has(entry.currentPath)
    );
  }

  protected createContent(): void {
    const { contentEl } = this;
    if (this.loadPreview && !this.previewReady) {
      this.showReadingProgress(contentEl, 0, 0);
      const signal = this.beginOperation().signal;
      void this.loadPreview(signal, (done, total) => {
        if (signal.aborted) {
          return;
        }
        this.showReadingProgress(contentEl, done, total);
      })
        .then(preview => {
          if (signal.aborted) {
            return;
          }
          this.movePreview = preview;
          this.previewReady = true;
          this.selectSuccessful(preview);
          this.readingEl = null;
          this.contentEl.empty();
          this.createContent();
        })
        .catch((error: unknown) => {
          if (signal.aborted) {
            return;
          }
          const message =
            error instanceof Error ? error.message : String(error);
          NoticeManager.error(
            fill(strings().notices.errorGeneratingPreview, { message })
          );
        });
      return;
    }
    const stats = this.movePreview;
    contentEl.createEl('p', {
      text: fill(strings().modals.previewSubtitle, {
        files: pluralize(stats.totalFiles, 'file'),
        moves: this.selectedEntries().length,
      }),
      cls: 'advancedNoteMover-modal-subtitle',
    });

    if (stats.totalFiles === 0) {
      this.renderEmptyState(contentEl, strings().modals.previewEmpty);
    } else if (
      this.selectedEntries().length === 0 &&
      stats.successfulMoves.length === 0
    ) {
      this.renderEmptyState(contentEl, strings().modals.previewEmptyExplain);
    }

    const files = stats.analyzed ?? stats.successfulMoves;
    if (files.length > 0) {
      this.createFileSection(contentEl, files);
    }

    this.createActionButtons(contentEl);
  }

  private showReadingProgress(
    container: HTMLElement,
    done: number,
    total: number
  ): void {
    const text =
      total === 0
        ? strings().modals.previewReadingStart
        : fill(strings().modals.previewReading, { done, total });
    if (!this.readingEl || !this.readingEl.isConnected) {
      this.readingEl = container.createDiv({
        cls: 'advancedNoteMover-preview-bulk-status',
        text,
      });
      this.readingEl.setAttribute('aria-live', 'polite');
      return;
    }
    this.readingEl.setText(text);
  }

  private renderEmptyState(container: HTMLElement, message: string): void {
    container.createDiv({
      cls: 'advancedNoteMover-modal-empty',
      text: message,
    });
    const actions = container.createDiv({
      cls: 'advancedNoteMover-preview-empty-actions',
    });
    this.createButton(actions, strings().modals.previewOpenRules, () => {
      this.openRules();
    });
  }

  private openRules(): void {
    this.close();
    const setting = (
      this.app as App & {
        setting?: {
          open: () => void;
          openTabById: (id: string) => void;
        };
      }
    ).setting;
    // shortcut: Obsidian has no public API for opening a plugin settings tab.
    if (!setting) {
      return;
    }
    setting.open();
    setting.openTabById('note-mover-shortcut');
  }

  private createFileSection(container: HTMLElement, entries: PreviewEntry[]) {
    const isMobile = MobileUtils.isMobile();
    const section = this.createSection(
      container,
      isMobile
        ? 'advancedNoteMover-preview-section advancedNoteMover-preview-section-success advancedNoteMover-preview-section-mobile'
        : 'advancedNoteMover-preview-section advancedNoteMover-preview-section-success'
    );

    const header = section.createDiv({
      cls: 'advancedNoteMover-modal-section-header',
    });
    const heading = header.createEl('h3');
    const iconEl = heading.createSpan({ cls: 'advancedNoteMover-icon' });
    iconEl.ariaHidden = 'true';
    setIcon(iconEl, 'check');
    heading.createSpan({
      text: fill(strings().modals.previewFiles, {
        count: entries.length,
      }),
    });

    const list = section.createDiv({
      cls: isMobile
        ? 'advancedNoteMover-modal-list advancedNoteMover-modal-list-mobile'
        : 'advancedNoteMover-modal-list',
    });

    entries.forEach(entry => {
      const item = list.createDiv({
        cls: isMobile
          ? 'advancedNoteMover-modal-list-item advancedNoteMover-preview-item-success advancedNoteMover-preview-item-mobile'
          : 'advancedNoteMover-modal-list-item advancedNoteMover-preview-item-success',
      });

      const row = item.createDiv({
        cls: 'advancedNoteMover-preview-item-row',
      });
      const selectLabel = row.createEl('label', {
        cls: 'advancedNoteMover-preview-select',
      });
      const checkbox = selectLabel.createEl('input', { type: 'checkbox' });
      checkbox.checked =
        entry.willBeMoved && this.selectedPaths.has(entry.currentPath);
      checkbox.disabled = !entry.willBeMoved;
      checkbox.setAttribute(
        'aria-label',
        fill(strings().modals.previewSelect, { fileName: entry.fileName })
      );
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedPaths.add(entry.currentPath);
        } else {
          this.selectedPaths.delete(entry.currentPath);
        }
        this.updateMoveButton();
      });
      const body = row.createDiv({
        cls: 'advancedNoteMover-preview-item-body',
      });

      const mainInfo = body.createDiv({
        cls: 'advancedNoteMover-preview-item-main',
      });
      const fileName = mainInfo.createDiv({
        cls: 'advancedNoteMover-preview-item-filename',
      });
      fileName.textContent = entry.fileName;

      const pathInfo = mainInfo.createDiv({
        cls: isMobile
          ? 'advancedNoteMover-preview-item-paths advancedNoteMover-preview-item-paths-mobile'
          : 'advancedNoteMover-preview-item-paths',
      });

      if (isMobile) {
        // Mobile: Stack paths vertically
        const currentPathEl = pathInfo.createDiv({
          cls: 'advancedNoteMover-preview-path-mobile advancedNoteMover-preview-path-current',
        });
        currentPathEl.textContent = entry.currentPath;

        const arrowEl = pathInfo.createDiv({
          cls: 'advancedNoteMover-preview-arrow-mobile',
        });
        arrowEl.textContent = '↓';

        const targetPathEl = pathInfo.createDiv({
          cls: 'advancedNoteMover-preview-path-mobile advancedNoteMover-preview-path-target',
        });
        targetPathEl.textContent = entry.targetPath;
      } else {
        // Desktop: Horizontal layout
        pathInfo.createSpan({
          cls: 'advancedNoteMover-current-path',
          text: entry.currentPath,
        });
        pathInfo.createSpan({
          cls: 'advancedNoteMover-arrow',
          text: ' → ',
        });
        pathInfo.createSpan({
          cls: 'advancedNoteMover-target-path',
          text: entry.targetPath ?? '',
        });
      }

      const details = body.createDiv({
        cls: isMobile
          ? 'advancedNoteMover-preview-item-details advancedNoteMover-preview-item-details-mobile'
          : 'advancedNoteMover-preview-item-details',
      });

      const showsRule = entry.willBeMoved && Boolean(entry.matchedRule);
      const reason = details.createDiv({
        cls: 'advancedNoteMover-preview-item-rule',
      });
      reason.createSpan({
        cls: 'advancedNoteMover-rule-label',
        text: showsRule
          ? strings().modals.previewRule
          : strings().modals.previewReasonLabel,
      });
      reason.createSpan({ text: previewRowLabel(entry) });

      if (entry.tags && entry.tags.length > 0) {
        const tags = details.createDiv({
          cls: 'advancedNoteMover-preview-item-tags',
        });
        tags.createSpan({
          cls: 'advancedNoteMover-tags-label',
          text: strings().modals.previewTags,
        });
        for (const tag of entry.tags) {
          tags.createSpan({ cls: 'advancedNoteMover-tag', text: ` ${tag}` });
        }
      }
    });
  }

  private createActionButtons(container: HTMLElement) {
    const isMobile = MobileUtils.isMobile();
    const footer = container.createDiv({
      cls: isMobile
        ? 'advancedNoteMover-modal-footer advancedNoteMover-modal-footer-mobile'
        : 'advancedNoteMover-modal-footer',
    });
    this.actionFooterEl = footer;

    const buttonContainer = this.createButtonContainer(footer);

    if (this.selectedEntries().length > 0) {
      this.moveButton = this.createButton(
        buttonContainer,
        fill(strings().modals.previewMoveFiles, {
          files: pluralize(this.selectedEntries().length, 'file'),
        }),
        () => {
          void this.executeMoves();
        },
        { isPrimary: true }
      );
    }

    this.createButton(
      buttonContainer,
      this.selectedEntries().length > 0
        ? strings().common.cancel
        : strings().common.close,
      () => {
        this.close();
      }
    );
  }

  private updateMoveButton(): void {
    if (!this.moveButton) {
      return;
    }
    const count = this.selectedEntries().length;
    this.moveButton.textContent = fill(strings().modals.previewMoveFiles, {
      files: pluralize(count, 'file'),
    });
    this.moveButton.hidden = count === 0;
  }

  private async executeMoves() {
    const successfulEntries = this.selectedEntries();
    if (successfulEntries.length === 0) {
      return;
    }
    let movedCount = 0;
    let errorCount = 0;
    let missingFolderSkippedCount = 0;
    let conflictSkippedCount = 0;
    const moveErrors: string[] = [];
    const controller = this.beginOperation();
    const signal = controller.signal;
    let status: HTMLElement | null = null;

    if (this.actionFooterEl) {
      this.actionFooterEl.empty();
      const created = this.actionFooterEl.createDiv({
        cls: 'advancedNoteMover-preview-bulk-status',
        text: fill(strings().modals.previewMoving, {
          count: successfulEntries.length,
        }),
      });
      created.setAttribute('aria-live', 'polite');
      status = created;
      const row = this.actionFooterEl.createDiv({
        cls: 'advancedNoteMover-preview-bulk-actions',
      });
      new Setting(row).addButton(btn =>
        btn.setButtonText(strings().modals.previewStop).onClick(() => {
          controller.abort();
          created.setText(strings().modals.previewStopping);
        })
      );
    }

    this.plugin.historyManager.startBulkOperation('bulk');

    try {
      for (let i = 0; i < successfulEntries.length; i++) {
        const entry = successfulEntries[i];
        if (signal.aborted) {
          break;
        }
        status?.setText(
          fill(strings().modals.previewMoveProgress, {
            done: i + 1,
            total: successfulEntries.length,
          })
        );
        try {
          const file = this.app.vault.getAbstractFileByPath(entry.currentPath);
          if (!(file instanceof TFile) || !entry.targetPath) continue;

          const targetFolder = entry.targetPath;
          const newPath = combinePath(targetFolder, file.name);
          if (file.path === newPath) continue;

          // Respect the folder-creation decision: skip if auto-create is
          // disabled and the destination folder is missing (e.g. it was
          // deleted between preview generation and execution).
          if (
            entry.createFolder === false &&
            !(await folderExists(this.app, targetFolder))
          ) {
            missingFolderSkippedCount++;
            continue;
          }

          if (!(await ensureFolderExists(this.app, targetFolder))) {
            throw createError(
              `Failed to create target folder: ${targetFolder}`
            );
          }

          const moveOutcome = await executeNoteMoveWithConflictHandling({
            app: this.app,
            settings: this.plugin.pluginData.settings,
            historyManager: this.plugin.historyManager,
            conflictSkipCache: this.plugin.conflictSkipCacheManager,
            file,
            originalPath: entry.currentPath,
            targetFolder,
            attachmentSettings: getAttachmentMoveSettings(
              this.plugin.pluginData.settings
            ),
            interactive: deriveConflictInteractive(
              this.plugin.pluginData.settings,
              false
            ),
            bypassConflictSkipCache: true,
            ruleName: entry.matchedRule,
            onPersistStrategy: async (strategy: ConflictResolutionStrategy) => {
              await persistConflictResolutionStrategy(this.plugin, strategy);
            },
          });

          if (moveOutcome.moved) {
            movedCount++;
          } else if (isNoteMoveConflictSkipOutcome(moveOutcome)) {
            conflictSkippedCount++;
          }
        } catch (error) {
          errorCount++;
          const message =
            error instanceof Error ? error.message : String(error);
          moveErrors.push(`${entry.fileName}: ${message}`);
        }
        if ((i + 1) % 50 === 0 && i + 1 < successfulEntries.length) {
          await new Promise<void>(resolve => {
            viewIdle(resolve, 250);
          });
        }
      }
    } finally {
      this.plugin.historyManager.endBulkOperation();
    }

    const stopped = signal.aborted;
    this.close();

    const skippedDetail = formatMoveSkippedDetail({
      missingFolder: missingFolderSkippedCount,
      conflict: conflictSkippedCount,
    });
    const totalSkipped = missingFolderSkippedCount + conflictSkippedCount;

    if (stopped) {
      NoticeManager.info(
        `Bulk move stopped. ${pluralize(movedCount, 'file')} moved, ${pluralize(errorCount, 'error')}.${skippedDetail}`
      );
    } else if (errorCount === 0 && totalSkipped === 0) {
      NoticeManager.success(
        `Successfully moved ${pluralize(movedCount, 'file')}!`
      );
    } else if (errorCount === 0) {
      NoticeManager.info(
        `Moved ${pluralize(movedCount, 'file')}.${skippedDetail}`
      );
    } else {
      NoticeManager.warning(
        `Moved ${pluralize(movedCount, 'file')} with ${pluralize(errorCount, 'error')}.${skippedDetail}`,
        {
          detailText: 'Show details',
          onDetail: () => {
            NoticeManager.error(moveErrors.join('; '));
          },
        }
      );
    }
  }
}
