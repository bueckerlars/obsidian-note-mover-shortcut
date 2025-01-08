import NoteMoverShortcutPlugin from "main";
import * as path from "path";
import { log_error, log_info } from "src/utils/Log";

export class NoteMoverShortcut {
    constructor(private plugin: NoteMoverShortcutPlugin) {}

    async setup(): Promise<void> {}

    async moveNotesFromInboxToNotesFolder() {
		const { app } = this.plugin;
		const inboxFolder = this.plugin.settings
        .inboxLocation;
		const notesFolder = this.plugin.settings.destination;
	
		// Check if both folders exist
		if (!await app.vault.adapter.exists(inboxFolder)) {
			await app.vault.createFolder(inboxFolder);
			log_info("Inbox folder created");
		}
	
		if (!await app.vault.adapter.exists(notesFolder)) {
			await app.vault.createFolder(notesFolder);
			log_info("Notes folder created");
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
				log_error(new Error(`Error moving file '${file.path}':`));
				return;
			}
		}
		log_info("Successfully moved all files from inbox to notes folder.");
	}

	async moveFocusedNoteToDestination() {
		const { app } = this.plugin;
		const destinationFolder = this.plugin.settings.destination; // Target folder from settings

		// Get the currently opened file in the focused tab
		const activeFile = app.workspace.getActiveFile();
		if (!activeFile) {
			log_error(new Error("No active file found."));
			return;
		}

		const currentPath = activeFile.path; // Current path of the file
		const fileName = activeFile.name; // File name
		const newPath = `${destinationFolder}/${fileName}`; // New path for the file
		
		if (newPath == currentPath) {
			log_error(new Error("Note is already in the target folder."));
			return;
		}
		
		try {
			// Check if the target folder exists
			const folderExists = app.vault.getAbstractFileByPath(destinationFolder);
			if (!folderExists) {
				await app.vault.createFolder(destinationFolder);
				log_info("Notes folder created");
			}

			// Move the file
			await app.fileManager.renameFile(activeFile, newPath);

			log_info(`The file was moved from ${currentPath} to ${newPath}.`);
		} catch (error) {
			log_error(new Error(`Error moving the file: ${error}`));
			return;
		}
	}
}