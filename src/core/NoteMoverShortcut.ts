import NoteMoverShortcutPlugin from "main";
import { getAllTags, TFile } from "obsidian";
import { log_error, log_info } from "../utils/Log";
import { Notice } from "obsidian";
import { combinePath } from "../utils/PathUtils";

export class NoteMoverShortcut {
	constructor(private plugin: NoteMoverShortcutPlugin) {}

	async setup(): Promise<void> {
		// Start periodic movement interval if enabled
		if (this.plugin.settings.enablePeriodicMovement) {
			this.togglePeriodicMovementInterval();
		}
	}

	private async moveFileBasedOnTags(file: TFile, defaultFolder: string, skipFilter: boolean = false): Promise<void> {
		const { app } = this.plugin;
		let targetFolder = defaultFolder;
		const originalPath = file.path;

		try {
			// Check if rules are enabled
			if (this.plugin.settings.enableRules) {
				// Get tags from file
				const tags = getAllTags(app.metadataCache.getFileCache(file)!) || [];
				const whitelist = this.plugin.settings.isFilterWhitelist;
				
				// Determine the target folder based on tags and rules
				if (tags) {
					for (const tag of tags) {
						if (!skipFilter) {
							// check if tag is in filter
							const filter = this.plugin.settings.filter.find(filter => filter === tag);
							// if blacklist and tag is in filter, skip
							if (!whitelist && filter) {
								return;
							}
							// if whitelist and tag is not in filter, skip
							else if (whitelist && !filter) {
									return;
							}
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
			
			const newPath = combinePath(targetFolder, file.name);

			// Move file to new path
			await app.fileManager.renameFile(file, newPath);

			// Add entry to history
			this.plugin.historyManager.addEntry({
				sourcePath: originalPath,
				destinationPath: newPath,
				fileName: file.name
			});
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
	}

	async moveFocusedNoteToDestination() {
		const { app } = this.plugin;
		const file = app.workspace.getActiveFile();

		if (!file) {
			log_error(new Error("No file is open"));
			return;
		}

		try {
			// Move file to destination without filtering
			await this.moveFileBasedOnTags(file, this.plugin.settings.destination, true);
			
			// Create notice with undo button
			const notice = new Notice("", 8000);
			const noticeEl = notice.noticeEl;
			
			// Add title
			const title = document.createElement("b");
			title.textContent = "NoteMover:";
			noticeEl.appendChild(title);
			noticeEl.appendChild(document.createElement("br"));
			
			// Add message
			const message = document.createElement("span");
			message.textContent = `Note "${file.name}" has been moved`;
			noticeEl.appendChild(message);
			
			// Add undo button
			const undoButton = document.createElement("button");
			undoButton.textContent = "Undo";
			undoButton.className = "mod-warning";
			undoButton.style.marginLeft = "10px";
			undoButton.onclick = async () => {
				try {
					console.log(`Attempting to undo move for file: ${file.name}`);
					const success = await this.plugin.historyManager.undoLastMove(file.name);
					if (success) {
						notice.hide();
						new Notice(`Note "${file.name}" has been moved back`, 3000);
					} else {
						new Notice(`Could not undo move for "${file.name}"`, 3000);
					}
				} catch (error) {
					console.error('Error in undo button click handler:', error);
					log_error(new Error(`Error undoing move: ${error.message}`));
				}
			};
			noticeEl.appendChild(undoButton);
			
		} catch (error) {
			log_error(error);
			return;
		}
	}

	private intervalId: number | null = null;

	public togglePeriodicMovementInterval(): void {
		// Clear interval if it is already running
		if (this.intervalId) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}

		// Start new interval if periodic movement is enabled
		if (this.plugin.settings.enablePeriodicMovement) {
			const interval = this.plugin.settings.periodicMovementInterval;
			this.intervalId = window.setInterval(async () => {
				await this.moveNotesFromInboxToNotesFolder();
			}, interval * 60 * 1000);
		}
	}
}
