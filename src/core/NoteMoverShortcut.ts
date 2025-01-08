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
				// Get tags from file
				const tags = app.metadataCache.getFileCache(file)?.tags?.map(tag => tag.tag) || [];
				
				let targetFolder = notesFolder;
				
				// Move file to default destination folder if no tags are found
				if (tags) {
					// Determine the target folder based on tags and rules
					for (const tag of tags) {
						const rule = this.plugin.settings.rules.find(rule => rule.tag === tag);
						if (rule) {
							targetFolder = rule.path;
							break;
						}
					}
				}

				// Create the new path in the determined target folder
				const newPath = path.join(targetFolder, file.name);

				// Move the file
				await app.vault.rename(file, newPath);
				log_info(`Moved '${file.name}' to '${newPath}'`);
			} catch (error) {
				log_error(new Error(`Error moving file '${file.path}': ${error.message}`));
				return;
			}
		}
		log_info("Successfully moved all files from inbox to notes folder.");
	}

	async moveFocusedNoteToDestination() {
		const { app } = this.plugin;
		const file = app.workspace.getActiveFile();

		if (!file) {
			log_error(new Error("No file is open"));
			return;
		}
		
		// Set default target folder
		let targetFolder = this.plugin.settings.destination;

		try {
			// Get tags from file
			const tags = app.metadataCache.getFileCache(file)?.tags?.map(tag => tag.tag) || [];
			
			// Determine the target folder based on tags and rules
			if (tags) {
				for (const tag of tags) {
					const rule = this.plugin.settings.rules.find(rule => rule.tag === tag);
					if (rule) {
						targetFolder = rule.path;
						break;
					}
				}
			}

			const newPath = path.join(targetFolder, file.name);

			// Move file
			await app.vault.rename(file, newPath);
			log_info(`Moved '${file.name}' to '${newPath}'`);
		} catch(e) {
			log_error(e);
			return;
		}
	}
}