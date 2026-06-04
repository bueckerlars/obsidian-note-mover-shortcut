import AdvancedNoteMoverPlugin from 'main';
import { HistoryModal } from '../modals/HistoryModal';
import { PreviewModal } from '../modals/PreviewModal';
import { handleError } from '../utils/Error';
import { NoticeManager } from '../utils/NoticeManager';
import { isMovableVaultFile } from '../domain/vault/movable-vault-files';

export class CommandHandler {
  constructor(private plugin: AdvancedNoteMoverPlugin) {}

  private hasActiveMovableFile(): boolean {
    const file = this.plugin.app.workspace.getActiveFile();
    return file != null && isMovableVaultFile(file);
  }

  setup(): void {
    // Singe note move command
    this.plugin.addCommand({
      id: 'trigger-note-movement',
      name: 'Move active note to note folder',
      checkCallback: (checking: boolean) => {
        if (checking) {
          return this.hasActiveMovableFile();
        }
        void this.plugin.advancedNoteMover.moveFocusedNoteToDestination();
        return true;
      },
    });

    // Bulk movement command
    this.plugin.addCommand({
      id: 'trigger-note-bulk-move',
      name: 'Move all files in vault',
      callback: () => {
        void this.plugin.advancedNoteMover.moveAllFilesInVault();
      },
    });

    // History command
    this.plugin.addCommand({
      id: 'show-history',
      name: 'Show history',
      callback: () => {
        new HistoryModal(
          this.plugin.app,
          this.plugin.historyManager,
          this.plugin
        ).open();
      },
    });

    // Preview bulk movement command
    this.plugin.addCommand({
      id: 'preview-bulk-movement',
      name: 'Preview bulk movement for all files',
      callback: async () => {
        try {
          const preview =
            await this.plugin.advancedNoteMover.generateVaultMovePreview();
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
      checkCallback: (checking: boolean) => {
        if (checking) {
          return this.hasActiveMovableFile();
        }
        void (async () => {
          try {
            const preview =
              await this.plugin.advancedNoteMover.generateActiveNotePreview();
            if (preview) {
              new PreviewModal(this.plugin.app, this.plugin, preview).open();
            } else {
              NoticeManager.warning('No active file to preview.');
            }
          } catch (error) {
            handleError(error, 'Error generating preview', false);
            NoticeManager.error(
              `Error generating preview: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        })();
        return true;
      },
    });

    // Add current file to blacklist command
    this.plugin.addCommand({
      id: 'add-current-file-to-blacklist',
      name: 'Add current file to blacklist',
      checkCallback: (checking: boolean) => {
        if (checking) {
          return this.hasActiveMovableFile();
        }
        void (async () => {
          try {
            const file = this.plugin.app.workspace.getActiveFile();
            const fileName = file?.name;
            if (!fileName) {
              NoticeManager.warning('No active file to add to blacklist.');
              return;
            }

            await this.plugin.advancedNoteMover.addFileToBlacklist(fileName);
          } catch (error) {
            handleError(error, 'Error adding file to blacklist', false);
            NoticeManager.error(
              `Error adding file to blacklist: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        })();
        return true;
      },
    });
  }
}
