import NoteMoverShortcutPlugin from "main";
import { TFile } from "obsidian";
import * as path from "path";
import { log_error, log_info } from "src/utils/Log";

export class NoteMoverShortcut {
	constructor(private plugin: NoteMoverShortcutPlugin) {}

	async setup(): Promise<void> {}

	private async moveFileBasedOnTags(file: TFile, defaultFolder: string): Promise<void> {
		const { app } = this.plugin;
		let targetFolder = defaultFolder;

		try {
			// Check if rules are enabled
			if (this.plugin.settings.enableRules) {
				// Get tags from file
				const tags = app.metadataCache.getFileCache(file)?.tags?.map(tag => tag.tag) || [];

				// Determine the target folder based on tags and rules
				if (tags) {
					for (const tag of tags) {
						const filter = this.plugin.settings.filter.find(filter => filter === tag);
						const whitelist = this.plugin.settings.isFilteWhitelist;
						// If blacklist and tag is in filter, skip
						if (!whitelist && filter) {
							return;
						}
						// If whitelist and tag is not in filter, skip
						else if(whitelist && !filter) {
							return;
						}

						
						// Apply matching rule
						const rule = this.plugin.settings.rules.find(rule => rule.tag === tag);
						if (rule) {
							targetFolder = rule.path;
							break;
						}

					}
				}
			}
			
			const newPath = path.join(targetFolder, file.name);

			// Move file
			await app.vault.rename(file, newPath);
			log_info(`Moved '${file.name}' to '${newPath}'`);
		} catch (error) {
			log_error(new Error(`Error moving file '${file.path}': ${error.message}`));
			throw error;
		}
	}

	async moveNotesFromInboxToNotesFolder() {
		const { app } = this.plugin;
		const inboxFolder = this.plugin.settings.inboxLocation;
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
				await this.moveFileBasedOnTags(file, notesFolder);
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

		try {
			await this.moveFileBasedOnTags(file, this.plugin.settings.destination);
		} catch (error) {
			log_error(error);
			return;
		}
	}
	private intervalId: NodeJS.Timeout | null = null;

	public togglePeriodicMovementInterval(): void {
		if (this.plugin.settings.enablePeriodicMovement) {
			const interval = this.plugin.settings.periodicMovementInterval;
			this.intervalId = setInterval(async () => {
				this.moveNotesFromInboxToNotesFolder();
			}, interval * 60 * 1000);
		} else if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}
