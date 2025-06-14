import NoteMoverShortcutPlugin from "main";
import { getAllTags, TFile } from "obsidian";
import { log_error, log_info } from "../utils/Log";
import { Notice } from "obsidian";
import { combinePath } from "../utils/PathUtils";
import { Plugin } from 'obsidian';
import { Rule, TagRule, GroupRule, Trigger } from 'src/settings/types';
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
			// Check if rules are enabled
			if (this.plugin.settings.enableRules) {
				// Get tags from file
				const tags = this.rulesManager.getTagsFromFile(file);
				
				// Determine the target folder based on tags and rules
				if (tags) {
					const matchingRule = await this.rulesManager.evaluateRules(this.plugin.settings.rules, tags, file);
					if (matchingRule) {
						targetFolder = matchingRule.path;
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

	private async evaluateRules(rules: Rule[], tags: string[], file: TFile): Promise<TagRule | null> {
		for (const rule of rules) {
			if (rule.type === 'rule') {
				if (tags.includes(rule.tag)) {
					// Check conditions
					if (!rule.condition || await this.evaluateConditions(rule, file)) {
						return rule;
					}
				}
			} else {
				// Evaluate group rules
				const matchingTrigger = await this.evaluateGroupTriggers(rule.triggers, tags, file);
				if (matchingTrigger) {
					return {
						id: rule.id,
						type: 'rule',
						tag: matchingTrigger.tag,
						path: rule.destination,
						condition: matchingTrigger.conditions
					};
				}

				// Evaluate subgroups
				if (rule.subgroups) {
					const subgroupResult = await this.evaluateRules(rule.subgroups, tags, file);
					if (subgroupResult) {
						return subgroupResult;
					}
				}
			}
		}
		return null;
	}

	private async evaluateGroupTriggers(triggers: Trigger[], tags: string[], file: TFile): Promise<Trigger | null> {
		for (const trigger of triggers) {
			if (tags.includes(trigger.tag)) {
				// Check conditions
				if (!trigger.conditions || await this.evaluateTriggerConditions(trigger, file)) {
					return trigger;
				}
			}
		}
		return null;
	}

	private async evaluateTriggerConditions(trigger: Trigger, file: TFile): Promise<boolean> {
		if (!trigger.conditions) return true;

		let conditionsMet = true;

		// Check date condition
		if (trigger.conditions.dateCondition) {
			const fileDate = trigger.conditions.dateCondition.type === 'created'
				? file.stat.ctime
				: file.stat.mtime;
			
			const now = Date.now();
			const daysDifference = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
			
			switch (trigger.conditions.dateCondition.operator) {
				case 'olderThan':
					if (daysDifference < trigger.conditions.dateCondition.days) conditionsMet = false;
					break;
				case 'newerThan':
					if (daysDifference > trigger.conditions.dateCondition.days) conditionsMet = false;
					break;
			}
		}

		// Check content condition
		if (trigger.conditions.contentCondition && conditionsMet) {
			const fileContent = await this.plugin.app.vault.read(file);
			const containsText = fileContent.includes(trigger.conditions.contentCondition.text);
			
			if (trigger.conditions.contentCondition.operator === 'contains' && !containsText) {
				conditionsMet = false;
			} else if (trigger.conditions.contentCondition.operator === 'notContains' && containsText) {
				conditionsMet = false;
			}
		}

		return conditionsMet;
	}

	private async evaluateConditions(rule: TagRule, file: TFile): Promise<boolean> {
		if (!rule.condition) return true;

		let conditionsMet = true;

		// Check date condition
		if (rule.condition.dateCondition) {
			const fileDate = rule.condition.dateCondition.type === 'created'
				? file.stat.ctime
				: file.stat.mtime;
			
			const now = Date.now();
			const daysDifference = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
			
			switch (rule.condition.dateCondition.operator) {
				case 'olderThan':
					if (daysDifference < rule.condition.dateCondition.days) conditionsMet = false;
					break;
				case 'newerThan':
					if (daysDifference > rule.condition.dateCondition.days) conditionsMet = false;
					break;
			}
		}

		// Check content condition
		if (rule.condition.contentCondition && conditionsMet) {
			const fileContent = await this.plugin.app.vault.read(file);
			const containsText = fileContent.includes(rule.condition.contentCondition.text);
			
			if (rule.condition.contentCondition.operator === 'contains' && !containsText) {
				conditionsMet = false;
			} else if (rule.condition.contentCondition.operator === 'notContains' && containsText) {
				conditionsMet = false;
			}
		}

		return conditionsMet;
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
