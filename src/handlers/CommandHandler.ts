import NoteMoverShortcutPlugin from 'main';
import { Editor, MarkdownView, Notice } from 'obsidian';
import { HistoryModal } from '../modals/HistoryModal';
import { UpdateModal } from '../modals/UpdateModal';
import { PreviewModal } from '../modals/PreviewModal';
import { createError, handleError } from '../utils/Error';
import { NoticeManager } from '../utils/NoticeManager';

export class CommandHandler {
  constructor(private plugin: NoteMoverShortcutPlugin) {}

  setup(): void {
    // Singe note move command
    this.plugin.addCommand({
      id: 'trigger-note-movement',
      name: 'Move active note to note folder',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.plugin.noteMover.moveFocusedNoteToDestination();
      },
    });

    // Bulk movement command
    this.plugin.addCommand({
      id: 'trigger-note-bulk-move',
      name: 'Move all files in vault',
      callback: () => {
        this.plugin.noteMover.moveAllFilesInVault();
      },
    });

    // History command
    this.plugin.addCommand({
      id: 'show-history',
      name: 'Show history',
      callback: () => {
        new HistoryModal(this.plugin.app, this.plugin.historyManager).open();
      },
    });

    // Update modal command (for testing/manual trigger)
    this.plugin.addCommand({
      id: 'show-update-modal',
      name: 'Show update modal',
      callback: () => {
        this.plugin.updateManager.showUpdateModal(true);
      },
    });

    // Preview bulk movement command
    this.plugin.addCommand({
      id: 'preview-bulk-movement',
      name: 'Preview bulk movement for all files',
      callback: async () => {
        try {
          const preview =
            await this.plugin.noteMover.generateVaultMovePreview();
          new PreviewModal(this.plugin.app, this.plugin, preview).open();
        } catch (error) {
          handleError(error, 'Error generating preview', false);
          NoticeManager.error(
            `Error generating preview: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
    });

    // Preview single note movement command
    this.plugin.addCommand({
      id: 'preview-note-movement',
      name: 'Preview active note movement',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        try {
          const preview =
            await this.plugin.noteMover.generateActiveNotePreview();
          if (preview) {
            new PreviewModal(this.plugin.app, this.plugin, preview).open();
          } else {
            NoticeManager.warning('No active note to preview.');
          }
        } catch (error) {
          handleError(error, 'Error generating preview', false);
          NoticeManager.error(
            `Error generating preview: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
    });

    // Add current file to blacklist command
    this.plugin.addCommand({
      id: 'add-current-file-to-blacklist',
      name: 'Add current file to blacklist',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        try {
          const fileName = view.file?.name;
          if (!fileName) {
            NoticeManager.warning('No active file to add to blacklist.');
            return;
          }

          // Create filename filter
          const filterValue = `fileName: ${fileName}`;

          // Check if filter already exists
          if (this.plugin.settings.filter.includes(filterValue)) {
            NoticeManager.warning(
              `File "${fileName}" is already in the blacklist.`
            );
            return;
          }

          // Add filter to settings
          this.plugin.settings.filter.push(filterValue);
          await this.plugin.save_settings();

          // Update RuleManager
          this.plugin.noteMover.updateRuleManager();

          NoticeManager.success(`File "${fileName}" added to blacklist.`);
        } catch (error) {
          handleError(error, 'Error adding file to blacklist', false);
          NoticeManager.error(
            `Error adding file to blacklist: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
    });
  }
}
