import NoteMoverShortcutPlugin from "main";
import { Editor, MarkdownView } from "obsidian";


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
    }
}

