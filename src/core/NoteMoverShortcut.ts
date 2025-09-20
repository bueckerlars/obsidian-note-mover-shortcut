import NoteMoverShortcutPlugin from "main";
import { SETTINGS_CONSTANTS, GENERAL_CONSTANTS, NOTIFICATION_CONSTANTS } from "../config/constants";
import { type OperationType } from "../types/Common";
import { getAllTags, TFile } from "obsidian";
import { NoticeManager } from "../utils/NoticeManager";
import { Notice } from "obsidian";
import { combinePath } from "../utils/PathUtils";
import { RuleManager } from "./RuleManager";
import { MovePreview } from "../types/MovePreview";
import { createError, handleError } from "../utils/Error";

export class NoteMoverShortcut {
	private ruleManager: RuleManager;

	constructor(private plugin: NoteMoverShortcutPlugin) {
		this.ruleManager = new RuleManager(plugin.app, plugin.settings.destination);
		this.updateRuleManager();
	}

	public updateRuleManager(): void {
		if (this.plugin.settings.enableRules) {
			this.ruleManager.setRules(this.plugin.settings.rules);
			this.ruleManager.setFilter(
				this.plugin.settings.filter,
				this.plugin.settings.isFilterWhitelist
			);
			this.ruleManager.setOnlyMoveNotesWithRules(
				this.plugin.settings.onlyMoveNotesWithRules
			);
		}
	}

	async setup(): Promise<void> {
		// Start periodic movement interval if enabled
		if (this.plugin.settings.enablePeriodicMovement) {
			this.togglePeriodicMovementInterval();
		}
	}

	public async moveFileBasedOnTags(file: TFile, defaultFolder: string, skipFilter: boolean = false): Promise<void> {
		const { app } = this.plugin;
		const originalPath = file.path;

		try {
			let targetFolder = defaultFolder;

			// Check if rules are enabled
			if (this.plugin.settings.enableRules) {
				const result = await this.ruleManager.moveFileBasedOnTags(file, skipFilter);
				if (result === null) {
					return; // File should be skipped based on filter or no matching rule
				}
				targetFolder = result;
			}
			
			const newPath = combinePath(targetFolder, file.name);

			// Ensure target folder exists before moving the file
			if (targetFolder !== '/' && targetFolder !== '') {
				if (!await app.vault.adapter.exists(targetFolder)) {
					await app.vault.createFolder(targetFolder);
					NoticeManager.info(`Target folder created: ${targetFolder}`);
				}
			}

			// Markiere Plugin-interne Verschiebung
			this.plugin.historyManager.markPluginMoveStart();

			try {
				// Move file to new path
				await app.fileManager.renameFile(file, newPath);

				// Add entry to history
				this.plugin.historyManager.addEntry({
					sourcePath: originalPath,
					destinationPath: newPath,
					fileName: file.name
				});
			} finally {
				// Beende Plugin-interne Verschiebung (auch bei Fehlern)
				this.plugin.historyManager.markPluginMoveEnd();
			}
		} catch (error) {
			handleError(error, `Error moving file '${file.path}'`);
		}
	}

	private async moveFilesFromInbox(options: {
		createFolders: boolean;
		showNotifications: boolean;
		operationType: OperationType;
	}): Promise<void> {
		const { app } = this.plugin;
		const inboxFolder = this.plugin.settings.inboxLocation;
		const notesFolder = this.plugin.settings.destination;

		// Check if both folders exist
		if (!await app.vault.adapter.exists(inboxFolder)) {
			if (options.createFolders) {
				await app.vault.createFolder(inboxFolder);
				if (options.showNotifications) {
					NoticeManager.info("Inbox folder created");
				}
			} else {
				return; // Don't create folders during periodic operations
			}
		}

		if (!await app.vault.adapter.exists(notesFolder)) {
			await app.vault.createFolder(notesFolder);
			if (options.showNotifications) {
				NoticeManager.info("Notes folder created");
			}
		}

		// Get all files in the inbox folder
		const files = await app.vault.getFiles();
		const inboxFiles = files.filter(file => file.path.startsWith(inboxFolder));

		if (inboxFiles.length === 0) {
			if (options.showNotifications) {
				NoticeManager.info("No files found in inbox folder");
			}
			return;
		}

		// Start bulk operation
		const bulkOperationId = this.plugin.historyManager.startBulkOperation(options.operationType);
		let successCount = 0;
		let errorCount = 0;

		try {
			// Iterate over each file and move it
			for (const file of inboxFiles) {
				try {
					await this.moveFileBasedOnTags(file, notesFolder);
					successCount++;
				} catch (error) {
					errorCount++;
					const errorMessage = options.operationType === 'periodic' 
						? `Error moving file '${file.path}' during periodic movement`
						: `Error moving file '${file.path}'`;
					handleError(error, errorMessage, false);
				}
			}

			// Show completion notice
			if (successCount > 0 && options.showNotifications) {
				if (options.operationType === 'bulk') {
					const totalFiles = successCount + errorCount;
					const successMessage = errorCount > 0 
						? `Moved ${successCount}/${totalFiles} files. ${errorCount} files had errors.`
						: `Successfully moved ${successCount} files`;
					
					NoticeManager.showWithUndo(
						'info',
						`Bulk Operation: ${successMessage}`,
						async () => {
							const success = await this.plugin.historyManager.undoBulkOperation(bulkOperationId);
							if (success) {
								NoticeManager.success(`Bulk operation undone: ${successCount} files moved back`, { duration: NOTIFICATION_CONSTANTS.CSS_STYLES.DURATION_OVERRIDE });
							} else {
								NoticeManager.warning(`Could not undo all moves. Check individual files in history.`, { duration: NOTIFICATION_CONSTANTS.CSS_STYLES.DURATION_OVERRIDE });
							}
						},
						SETTINGS_CONSTANTS.UI_TEXTS.UNDO_ALL
					);
				} else {
					NoticeManager.info(`Periodic movement: Successfully moved ${successCount} files`);
				}
			}

		} finally {
			// End bulk operation
			this.plugin.historyManager.endBulkOperation();
		}
	}

	async moveNotesFromInboxToNotesFolder() {
		await this.moveFilesFromInbox({
			createFolders: true,
			showNotifications: true,
			operationType: 'bulk'
		});
	}

	/**
	 * Periodic version of bulk move - same logic but marked as periodic operation
	 */
	async moveNotesFromInboxToNotesFolderPeriodic() {
		await this.moveFilesFromInbox({
			createFolders: false,
			showNotifications: false,
			operationType: 'periodic'
		});
	}

	async moveFocusedNoteToDestination() {
		const { app } = this.plugin;
		const file = app.workspace.getActiveFile();

		if (!file) {
			handleError(createError("No file is open"), "moveFocusedNoteToDestination", false);
			return;
		}

		try {
			// Move file to destination without filtering
			await this.moveFileBasedOnTags(file, this.plugin.settings.destination, true);
			
			// Create notice with undo button
			NoticeManager.showWithUndo(
				'info',
				`Note "${file.name}" has been moved`,
				async () => {
					try {
						NoticeManager.info(`Attempting to undo move for file: ${file.name}`);
						const success = await this.plugin.historyManager.undoLastMove(file.name);
						if (success) {
							NoticeManager.success(`Note "${file.name}" has been moved back`, { duration: 3000 });
						} else {
							NoticeManager.warning(`Could not undo move for "${file.name}"`, { duration: 3000 });
						}
					} catch (error) {
						handleError(error, "Error in undo button click handler", false);
					}
				},
				"Undo"
			);
			
		} catch (error) {
			handleError(error, "moveFocusedNoteToDestination", false);
			return;
		}
	}

	/**
	 * Generates a preview of moves for files in the inbox folder
	 */
	async generateInboxMovePreview(): Promise<MovePreview> {
		const { app } = this.plugin;
		const inboxFolder = this.plugin.settings.inboxLocation;

		// Check if inbox folder exists, create if not
		if (!await app.vault.adapter.exists(inboxFolder)) {
			await app.vault.createFolder(inboxFolder);
			NoticeManager.info("Inbox folder created");
		}

		// Get all files in the inbox folder
		const files = await app.vault.getFiles();
		const inboxFiles = files.filter(file => file.path.startsWith(inboxFolder));

		// Generate preview using RuleManager
		return await this.ruleManager.generateMovePreview(
			inboxFiles,
			this.plugin.settings.enableRules,
			this.plugin.settings.enableFilter,
			this.plugin.settings.isFilterWhitelist
		);
	}

	/**
	 * Generates a preview for the currently active note
	 */
	async generateActiveNotePreview(): Promise<MovePreview | null> {
		const { app } = this.plugin;
		const activeFile = app.workspace.getActiveFile();

		if (!activeFile) {
			return null;
		}

		// Generate preview for single file
		return await this.ruleManager.generateMovePreview(
			[activeFile],
			this.plugin.settings.enableRules,
			this.plugin.settings.enableFilter,
			this.plugin.settings.isFilterWhitelist
		);
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
				await this.moveNotesFromInboxToNotesFolderPeriodic();
			}, interval * GENERAL_CONSTANTS.TIME_CONVERSIONS.MINUTES_TO_MILLISECONDS);
		}
	}
}
