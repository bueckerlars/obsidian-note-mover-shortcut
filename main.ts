import { App, Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, NoteMoverShortcutSettings, NoteMoverShortcutSettingsTab } from "src/settings/Settings";

export default class NoteMoverShortcutPlugin extends Plugin {
	public settings: NoteMoverShortcutSettings;

	async onload() {
		await this.load_settings();

		const ribbonIconEl = this.addRibbonIcon('book-plus', 'NoteMover', (evt: MouseEvent) => {
			this.moveFocusedNoteToDestination();
			new Notice('Note moved to the configured folder!');
		});

		this.addCommand({
			id: 'trigger-note-movement-command',
			name: 'Move note to configured folder',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.moveFocusedNoteToDestination();
			},
		});

		this.addSettingTab(new NoteMoverShortcutSettingsTab(this.app, this));
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
