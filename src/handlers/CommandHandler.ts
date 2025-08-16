import NoteMoverShortcutPlugin from "main";
import { Editor, MarkdownView } from "obsidian";
import { HistoryModal } from "../modals/HistoryModal";
import { UpdateModal } from "../modals/UpdateModal";


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
                this.plugin.updateManager.showUpdateModal();
            }
        });
    }
}

