import NoteMoverShortcutPlugin from "main";
import { TFile } from "obsidian";
import { log_error, log_info } from "../utils/Log";
import { Notice } from "obsidian";
import { combinePath } from "../utils/PathUtils"; 
import { RulesManager } from "./RulesManager";

export class NoteMoverShortcut {
	private rulesManager: RulesManager;

	constructor(private plugin: NoteMoverShortcutPlugin) {
		this.rulesManager = new RulesManager(plugin.app);
	}

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
			// Check if filter is enabled and not skipped
			if (this.plugin.settings.enableFilter && !skipFilter) {
				const tags = this.rulesManager.getTagsFromFile(file);
				const hasMatchingTag = tags.some(tag => this.plugin.settings.filter.includes(tag));
				
				// If whitelist mode and no matching tag, or blacklist mode and matching tag, skip the file
				if ((this.plugin.settings.isFilterWhitelist && !hasMatchingTag) || 
					(!this.plugin.settings.isFilterWhitelist && hasMatchingTag)) {
					return;
				}
			}

			// Check if rules are enabled
			if (this.plugin.settings.enableRules) {
				// Get tags from file
				const tags = this.rulesManager.getTagsFromFile(file);
				
				// Determine the target folder based on tags and rules
				if (tags) {
					try {
						const matchingRule = await this.rulesManager.evaluateRules(this.plugin.settings.rules, tags, file);
						if (matchingRule) {
							targetFolder = matchingRule.path;
						}
					} catch (err) {
						// Error reading file content: fallback to default
						log_error(new Error(`Error reading file content: ${err?.message || err}`));
						targetFolder = defaultFolder;
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
