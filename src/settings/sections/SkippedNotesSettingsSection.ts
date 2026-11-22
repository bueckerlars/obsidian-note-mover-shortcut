import { Menu, TFile } from 'obsidian';
import { ConfirmModal } from '../../modals/ConfirmModal';
import { fill, strings } from '../../i18n/locale';
import type { ConflictSkipCacheEntry } from '../../types/ConflictSkipCache';
import { handleError } from '../../utils/Error';
import { formatRelativeDateTime } from '../../utils/formatDate';
import { getParentPath } from '../../utils/PathUtils';
import { createSettingGroup } from '../settingGroup';
import type { SectionContext } from '../pages';

function baseName(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.[^.]+$/, '');
}

/** "Skipped notes" sub-page, replacing the old conflict list modal. */
export class SkippedNotesSettingsSection {
  constructor(private readonly ctx: SectionContext) {}

  render(): void {
    const { plugin, containerEl } = this.ctx;
    const labels = strings().settings;
    const entries = plugin.conflictSkipCacheManager.getEntries();

    const heading =
      entries.length === 0
        ? labels.skippedHeadingNone
        : fill(
            entries.length === 1
              ? labels.skippedHeadingOne
              : labels.skippedHeadingMany,
            { count: entries.length }
          );
    const group = createSettingGroup(containerEl, {
      heading,
      description: labels.skippedDesc,
    });

    if (entries.length === 0) {
      return;
    }
    group.addButton(button => {
      button.setButtonText(labels.skippedClear).onClick(() => {
        void this.clearAll();
      });
      button.buttonEl.addClass('advancedNoteMover-quiet-button');
    });

    for (const entry of entries) {
      group.addSetting(setting => {
        const stale = !(
          plugin.app.vault.getAbstractFileByPath(entry.sourcePath) instanceof
          TFile
        );
        const name = baseName(entry.sourcePath);
        setting.setName(name);
        setting.setDesc(this.describe(entry));
        if (stale) {
          setting.settingEl.addClass('advancedNoteMover-dim');
          setting.nameEl.createSpan({
            cls: 'advancedNoteMover-pill',
            text: labels.skippedStale,
          });
          setting.addExtraButton(button => {
            button
              .setIcon('x')
              .setTooltip(fill(labels.skippedRemoveFor, { name }))
              .onClick(() => void this.remove(entry));
            button.extraSettingsEl.setAttr(
              'aria-label',
              fill(labels.skippedRemoveFor, { name })
            );
          });
          return;
        }
        setting.addButton(button =>
          button
            .setButtonText(labels.skippedResolve)
            .onClick(() => void this.resolve(entry))
        );
        setting.addExtraButton(button => {
          const label = fill(labels.skippedMoreFor, { name });
          button.setIcon('more-horizontal').setTooltip(label);
          button.extraSettingsEl.setAttr('aria-label', label);
          button.extraSettingsEl.setAttr('role', 'button');
          button.onClick(() => {
            const rect = button.extraSettingsEl.getBoundingClientRect();
            this.showMenu(entry, { x: rect.left, y: rect.bottom });
          });
        });
      });
    }
  }

  private describe(entry: ConflictSkipCacheEntry): string {
    const from = getParentPath(entry.sourcePath) || '/';
    const to = getParentPath(entry.targetPath) || '/';
    return [
      `${from} → ${to}`,
      entry.ruleName,
      formatRelativeDateTime(entry.skippedAt),
    ]
      .filter(Boolean)
      .join(' · ');
  }

  private showMenu(
    entry: ConflictSkipCacheEntry,
    position: { x: number; y: number }
  ): void {
    const labels = strings().settings;
    const menu = new Menu();
    menu.addItem(item =>
      item
        .setTitle(labels.skippedOpenNote)
        .setIcon('external-link')
        .onClick(() => this.openNote(entry))
    );
    menu.addItem(item =>
      item
        .setTitle(labels.skippedRemove)
        .setIcon('x')
        .onClick(() => void this.remove(entry))
    );
    menu.showAtPosition(position);
  }

  private openNote(entry: ConflictSkipCacheEntry): void {
    const { app } = this.ctx.plugin;
    const file = app.vault.getAbstractFileByPath(entry.sourcePath);
    if (file instanceof TFile) {
      void app.workspace.getLeaf().openFile(file);
    }
  }

  private async remove(entry: ConflictSkipCacheEntry): Promise<void> {
    await this.ctx.plugin.conflictSkipCacheManager.removeEntry(
      entry.sourcePath,
      entry.targetPath
    );
    this.ctx.refresh();
  }

  /** Same flow as the old Retry: drop the entry and move again with the conflict dialog allowed. */
  private async resolve(entry: ConflictSkipCacheEntry): Promise<void> {
    const { plugin } = this.ctx;
    const file = plugin.app.vault.getAbstractFileByPath(entry.sourcePath);
    await this.remove(entry);
    if (!(file instanceof TFile)) {
      return;
    }
    try {
      await plugin.advancedNoteMover.moveFileBasedOnTags(file, '/', false, {
        bypassConflictSkipCache: true,
      });
    } catch (error) {
      handleError(
        error,
        fill(strings().notices.errorRetryingMove, { path: file.path }),
        false
      );
    }
    this.ctx.refresh();
  }

  private async clearAll(): Promise<void> {
    const { plugin } = this.ctx;
    const confirmed = await ConfirmModal.show(plugin.app, {
      title: strings().modals.conflictCacheClearTitle,
      message: strings().modals.conflictCacheClearMessage,
      confirmText: strings().settings.skippedClear,
      cancelText: strings().common.cancel,
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await plugin.conflictSkipCacheManager.clearAll();
    this.ctx.refresh();
  }
}
