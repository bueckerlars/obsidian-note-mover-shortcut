import NoteMoverShortcutPlugin from "main";
import { Editor, MarkdownView, Notice } from "obsidian";
import { HistoryModal } from "../modals/HistoryModal";
import { UpdateModal } from "../modals/UpdateModal";
import { PreviewModal } from "../modals/PreviewModal";


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
            name: 'Move all notes from inbox to notes folder',
            callback: () => {
                this.plugin.noteMover.moveNotesFromInboxToNotesFolder();
            },
        });

        // History command
        this.plugin.addCommand({
            id: 'show-history',
            name: 'Show history',
            callback: () => {
                new HistoryModal(this.plugin.app, this.plugin.historyManager).open();
            }
        });

        // Update modal command (for testing/manual trigger)
        this.plugin.addCommand({
            id: 'show-update-modal',
            name: 'Show update modal',
            callback: () => {
                this.plugin.updateManager.showUpdateModal(true);
            }
        });

        // Preview bulk movement command
        this.plugin.addCommand({
            id: 'preview-bulk-movement',
            name: 'Preview bulk movement from inbox',
            callback: async () => {
                try {
                    const preview = await this.plugin.noteMover.generateInboxMovePreview();
                    new PreviewModal(this.plugin.app, this.plugin, preview).open();
                } catch (error) {
                    new Notice(`Error generating preview: ${error.message}`);
                }
            }
        });

        // Preview single note movement command
        this.plugin.addCommand({
            id: 'preview-note-movement',
            name: 'Preview active note movement',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                try {
                    const preview = await this.plugin.noteMover.generateActiveNotePreview();
                    if (preview) {
                        new PreviewModal(this.plugin.app, this.plugin, preview).open();
                    } else {
                        new Notice('No active note to preview.');
                    }
                } catch (error) {
                    new Notice(`Error generating preview: ${error.message}`);
                }
            }
        });
    }
}

