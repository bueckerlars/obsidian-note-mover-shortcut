import { App, Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import * as path from 'path';
import { DEFAULT_SETTINGS, NoteMoverShortcutSettings, NoteMoverShortcutSettingsTab } from "src/settings/Settings";

export default class NoteMoverShortcutPlugin extends Plugin {
	public settings: NoteMoverShortcutSettings;

	async onload() {
		await this.load_settings();

		const ribbonIconEl = this.addRibbonIcon('book-plus', 'NoteMover', (evt: MouseEvent) => {
			this.moveFocusedNoteToDestination();
			new Notice('Note moved to the configured folder!');
		});

		// Singe note move command
		this.addCommand({
			id: 'trigger-note-movement-command',
			name: 'Move active note to note folder',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.moveFocusedNoteToDestination();
			},
		});

		// Bulk movement command
		this.addCommand({
			id: 'trigger-note-bulk-move-command',
			name: 'Move all notes from inbox to notes folder',
			callback: () => {
				this.moveNotesFromInboxToNotesFolder();
			},
		});

		this.addSettingTab(new NoteMoverShortcutSettingsTab(this.app, this));
	}

	async moveNotesFromInboxToNotesFolder() {
		const { app } = this;
		const inboxFolder = this.settings.inboxLocation;
		const notesFolder = this.settings.destination;
	
		// Check if both folders exist
		if (!await app.vault.adapter.exists(inboxFolder)) {
			await app.vault.createFolder(inboxFolder);
			new Notice("Inbox folder created");
		}
	
		if (!await app.vault.adapter.exists(notesFolder)) {
			await app.vault.createFolder(notesFolder);
			new Notice("Notes folder created");
		}
	
		// Get all files in the inbox folder
		const files = await app.vault.getFiles();
		const inboxFiles = files.filter(file => file.path.startsWith(inboxFolder));
	
		// Iterate over each file and move it
		for (const file of inboxFiles) {
			try {
				// Create the new path in the notes folder
				const newPath = path.join(notesFolder, file.name);
	
				// Move the file
				await app.vault.rename(file, newPath);
				console.log(`Moved '${file.path}' to '${newPath}'`);
			} catch (error) {
				new Notice(`Error moving file '${file.path}':`, error);
				console.error(`Error moving file '${file.path}':`, error);
				return;
			}
		}
		new Notice("Successfully moved all files from inbox to notes folder.");
	}

	async moveFocusedNoteToDestination() {
		const { app } = this;
		const destinationFolder = this.settings.destination; // Target folder from settings

		// Get the currently opened file in the focused tab
		const activeFile = app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file found.");
			return;
		}

		const currentPath = activeFile.path; // Current path of the file
		const fileName = activeFile.name; // File name
		const newPath = `${destinationFolder}/${fileName}`; // New path for the file
		
		if (newPath == currentPath) {
			new Notice("Note is already in the target folder.");
			return;
		}
		
		try {
			// Check if the target folder exists
			const folderExists = app.vault.getAbstractFileByPath(destinationFolder);
			if (!folderExists) {
				await app.vault.createFolder(destinationFolder);
			}

			// Move the file
			await app.fileManager.renameFile(activeFile, newPath);

			new Notice(`The file was moved from ${currentPath} to ${newPath}.`);
		} catch (error) {
			console.error("Error while moving the file:", error);
			new Notice("Error while moving the file. Please check the plugin settings.");
		}
	}

	onunload() {
	}

	async save_settings(): Promise<void> {
        await this.saveData(this.settings);
    }

    async load_settings(): Promise<void> {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }
}
