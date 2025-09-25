import NoteMoverShortcutPlugin from "main";
import { PluginSettingTab, App, Setting } from "obsidian";
import { FolderSuggest } from "./suggesters/FolderSuggest";
import { TagSuggest } from "./suggesters/TagSuggest";
import { createError, handleError } from "src/utils/Error";
import { NoticeManager } from "src/utils/NoticeManager";
import { HistoryEntry, BulkOperation } from '../types/HistoryEntry';
import { ConfirmModal } from "../modals/ConfirmModal";
import { SETTINGS_CONSTANTS } from "../config/constants";
import { SettingsValidator } from "src/utils/SettingsValidator";

interface Rule {
	criteria: string, // Format: "type: value" (e.g. "tag: #project", "fileName: notes.md")
	path: string,
}

export interface NoteMoverShortcutSettings {
	destination: string,
	inboxLocation: string,
	enablePeriodicMovement: boolean,
	periodicMovementInterval: number,
	enableFilter: boolean,
	filter: string[],
	isFilterWhitelist: boolean,
	enableRules: boolean,
	rules: Rule[],
	onlyMoveNotesWithRules: boolean,
	history?: HistoryEntry[],
	bulkOperations?: BulkOperation[],
	lastSeenVersion?: string,
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings = SETTINGS_CONSTANTS.DEFAULT_SETTINGS;

export class NoteMoverShortcutSettingsTab extends PluginSettingTab {
	constructor(private plugin: NoteMoverShortcutPlugin) {
		super(plugin.app, plugin);
	}

	display(): void {
		this.containerEl.empty();

		this.add_inbox_folder_setting();
		this.add_target_folder_setting();

		this.add_periodic_movement_setting();

		this.add_filter_settings();

		this.add_rules_setting();
		if (this.plugin.settings.enableRules) {
			this.add_rules_array();
			this.add_add_rule_button_setting();
		}

		this.add_history_settings();

		this.add_import_export_settings();
	}

	add_inbox_folder_setting(): void {
		new Setting(this.containerEl)
			.setName('Inbox folder')
			.setDesc('Set your inbox folder')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.FOLDER_PATH)
					.setValue(this.plugin.settings.inboxLocation)
					.onChange((new_folder) => {
						this.plugin.settings.inboxLocation = new_folder;
						this.plugin.save_settings();
					});
			});
	}

	add_target_folder_setting(): void {
		new Setting(this.containerEl)
			.setName('Note folder')
			.setDesc('Set your main note folder')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.FOLDER_PATH)
					.setValue(this.plugin.settings.destination)
					.onChange((new_folder) => {
						this.plugin.settings.destination = new_folder;
						this.plugin.save_settings();
					});
			});
	}

	add_periodic_movement_setting(): void {
		new Setting(this.containerEl).setName('Periodic movement').setHeading();

		new Setting(this.containerEl)
			.setName('Enable periodic movement')
			.setDesc('Enable the periodic movement of notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enablePeriodicMovement)
				.onChange(async (value) => {
					this.plugin.settings.enablePeriodicMovement = value;
					await this.plugin.save_settings();
					// Toggle interval based in the new value
					this.plugin.noteMover.togglePeriodicMovementInterval();
					
					// Force refresh display
					this.display();
				})
			);
		
		if (this.plugin.settings.enablePeriodicMovement) {
			new Setting(this.containerEl)
				.setName('Periodic movement interval')
				.setDesc('Set the interval for the periodic movement of notes in minutes')
				.addText(text => text
					.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.INTERVAL)
					.setValue(this.plugin.settings.periodicMovementInterval.toString())
					.onChange(async (value) => {
						const interval = parseInt(value);
						if (isNaN(interval)) {
							handleError(createError('Interval must be a number'), 'Periodic movement interval setting', false);
							return;
						}
						if (interval < 1) {
							handleError(createError('Interval must be greater than 0'), 'Periodic movement interval setting', false);
							return;
						}

						this.plugin.settings.periodicMovementInterval = interval;
						await this.plugin.save_settings();
					})
				);
		}
	}

	add_filter_settings(): void {
		// Filter settings
		new Setting(this.containerEl).setName('Filter').setHeading();

		new Setting(this.containerEl)
			.setName('Enable filter')
			.setDesc('Enable the filter')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFilter)
				.onChange(async (value) => {
					this.plugin.settings.enableFilter = value;
					await this.plugin.save_settings();
					this.display();
				})
			);

		if (this.plugin.settings.enableFilter) {
			new Setting(this.containerEl)
			.setName('Toggle blacklist/whitelist')
			.setDesc('Toggle between a blacklist or a whitelist')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isFilterWhitelist)
				.onChange(async (value) => {
					this.plugin.settings.isFilterWhitelist = value;
					await this.plugin.save_settings();
					// Update RuleManager
					this.plugin.noteMover.updateRuleManager();
				})
			);
	
			this.add_periodic_movement_filter_array();
	
			new Setting(this.containerEl)
				.addButton(btn => btn
					.setButtonText('Add new filter')
					.setCta()
					.onClick(async () => {
						this.plugin.settings.filter.push('');
						await this.plugin.save_settings();
						// Update RuleManager
						this.plugin.noteMover.updateRuleManager();
						this.display();
					})
				);
		}

	}

	add_periodic_movement_filter_array(): void {
		this.plugin.settings.filter.forEach((filter, index) => {
			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					// AdvancedSuggest instead of TagSuggest
					new (require("./suggesters/AdvancedSuggest")).AdvancedSuggest(this.app, cb.inputEl);
					cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.FILTER)
						.setValue(filter || "")
						.onChange(async (value) => {
							// Don't save empty filters
							if (!value || value.trim() === "") {
								this.plugin.settings.filter[index] = "";
							} else {
								this.plugin.settings.filter[index] = value;
							}
							await this.plugin.save_settings();
							// Update RuleManager
							this.plugin.noteMover.updateRuleManager();
						});
					// @ts-ignore
					cb.containerEl.addClass("note_mover_search");
				})
				.addExtraButton(btn => btn
					.setIcon('up-chevron-glyph')
					.onClick(() => {
						this.moveFilter(index, -1);
					})
				)
				.addExtraButton(btn => btn
					.setIcon('down-chevron-glyph')
					.onClick(() => {
						this.moveFilter(index, 1);
					})
				)
				.addExtraButton(btn => btn
					.setIcon('cross')
					.onClick(async () => {
						this.plugin.settings.filter.splice(index, 1);
						await this.plugin.save_settings();
						// Update RuleManager
						this.plugin.noteMover.updateRuleManager();
						this.display();
					})
				);
				s.infoEl.remove();
		});
	}

	add_rules_setting(): void {
		new Setting(this.containerEl).setName('Rules').setHeading();

		const descUseRules = document.createDocumentFragment();
		descUseRules.append(
			'When enabled, the NoteMover will move notes to the folder associated with the specified criteria.',
			document.createElement('br'),
			'Criteria can be tags, filenames, paths, content, properties, or dates. If multiple rules match, the first one will be applied.',
		);

		new Setting(this.containerEl)
			.setName('Enable rules')
			.setDesc(descUseRules)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableRules)
				.onChange(async (value) => {
					this.plugin.settings.enableRules = value;
					await this.plugin.save_settings();
					// Update RuleManager
					this.plugin.noteMover.updateRuleManager();
					this.display();
				})
			);

		if (this.plugin.settings.enableRules) {
			const descOnlyMoveWithRules = document.createDocumentFragment();
			descOnlyMoveWithRules.append(
				'When enabled, only notes that match defined rules will be moved. Notes without matching rules will be left untouched.',
				document.createElement('br'),
				'When disabled, notes without matching rules will be moved to the default destination folder.',
			);

			new Setting(this.containerEl)
				.setName('Only move notes with rules')
				.setDesc(descOnlyMoveWithRules)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.onlyMoveNotesWithRules)
					.onChange(async (value) => {
						this.plugin.settings.onlyMoveNotesWithRules = value;
						await this.plugin.save_settings();
						// Update RuleManager
						this.plugin.noteMover.updateRuleManager();
					})
				);
		}
	}

	add_add_rule_button_setting(): void {
		new Setting(this.containerEl)
			.addButton(btn => btn
				.setButtonText('Add new rule')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.rules.push({ criteria: '', path: '' });
					await this.plugin.save_settings();
					// Update RuleManager
					this.plugin.noteMover.updateRuleManager();
					this.display();
				})
			);
	}

	add_rules_array(): void {
		this.plugin.settings.rules.forEach((rule, index) => {
			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					// AdvancedSuggest instead of TagSuggest
					new (require("./suggesters/AdvancedSuggest")).AdvancedSuggest(this.app, cb.inputEl);
					cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.CRITERIA)
						.setValue(rule.criteria)
						.onChange(async (value) => {
							if (value && this.plugin.settings.rules.some(
								(rule) => rule.criteria === value
							)
							) {
								handleError(
									createError("This criteria already has a folder associated with it"),
									"Rules setting",
									false
								);
								return;
							}

							// Save Setting
							this.plugin.settings.rules[index].criteria = value;
							await this.plugin.save_settings();
							// Update RuleManager
							this.plugin.noteMover.updateRuleManager();
						});
					// @ts-ignore
					cb.containerEl.addClass("note_mover_search");
				})
				.addSearch((cb) => {
					new FolderSuggest(this.app, cb.inputEl);
					cb.setPlaceholder(SETTINGS_CONSTANTS.PLACEHOLDER_TEXTS.PATH)
						.setValue(rule.path)
						.onChange(async (value) => {
							this.plugin.settings.rules[index].path = value;
							await this.plugin.save_settings();
						});
					// @ts-ignore
					cb.containerEl.addClass("note_mover_search");
				})
				.addExtraButton(btn => btn
					.setIcon('up-chevron-glyph')
					.onClick(() => {
						this.moveRule(index, -1);
					})
				)
				.addExtraButton(btn => btn
					.setIcon('down-chevron-glyph')
					.onClick(() => {
						this.moveRule(index, 1);
					})
				)
				.addExtraButton(btn => btn
					.setIcon('cross')
					.onClick(async () => {
						this.plugin.settings.rules.splice(index, 1);
						await this.plugin.save_settings();
						// Update RuleManager
						this.plugin.noteMover.updateRuleManager();
						this.display();
					})
				);
				s.infoEl.remove();
			});
	}

	moveRule(index: number, direction: number) {
		const newIndex = Math.max(0, Math.min(this.plugin.settings.rules.length - 1, index + direction));
		[this.plugin.settings.rules[index], this.plugin.settings.rules[newIndex]] = [this.plugin.settings.rules[newIndex], this.plugin.settings.rules[index]];
		this.plugin.save_settings();
		this.display();
	}

	moveFilter(index: number, direction: number) {
		const newIndex = Math.max(0, Math.min(this.plugin.settings.filter.length - 1, index + direction));
		[this.plugin.settings.filter[index], this.plugin.settings.filter[newIndex]] = [this.plugin.settings.filter[newIndex], this.plugin.settings.filter[index]];
		this.plugin.save_settings();
		this.display();
	}

	add_history_settings(): void {
		new Setting(this.containerEl).setName('History').setHeading();

		new Setting(this.containerEl)
			.setName('Clear history')
			.setDesc('Clears the history of moved notes')
			.addButton(btn => btn
				.setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY)
				.setWarning()
				.onClick(async () => {
					const confirmed = await ConfirmModal.show(this.app, {
						title: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_TITLE,
						message: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_MESSAGE,
						confirmText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CONFIRM,
						cancelText: SETTINGS_CONSTANTS.UI_TEXTS.CLEAR_HISTORY_CANCEL,
						danger: true
					});
					
					if (confirmed) {
						await this.plugin.historyManager.clearHistory();
					}
				})
			);
	}

	add_import_export_settings(): void {
		new Setting(this.containerEl).setName('Import/Export').setHeading();

		// Export Settings Button
		new Setting(this.containerEl)
			.setName('Export settings')
			.setDesc('Export your current settings as a JSON file')
			.addButton(btn => btn
				.setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.EXPORT_SETTINGS)
				.setCta()
				.onClick(async () => {
					await this.exportSettings();
				})
			);

		// Import Settings Button
		new Setting(this.containerEl)
			.setName('Import settings')
			.setDesc('Import settings from a JSON file')
			.addButton(btn => btn
				.setButtonText(SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS)
				.setWarning()
				.onClick(async () => {
					await this.importSettings();
				})
			);
	}

	private async exportSettings(): Promise<void> {
		try {
			// Create a clean copy of settings for export, excluding history
			const settingsToExport = { ...this.plugin.settings };
			
			// Remove history-related fields from export
			delete settingsToExport.history;
			delete settingsToExport.bulkOperations;
			
			// Convert to JSON string with proper formatting
			const jsonString = JSON.stringify(settingsToExport, null, 2);
			
			// Create blob and download
			const blob = new Blob([jsonString], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			// Create download link
			const link = document.createElement('a');
			link.href = url;
			link.download = `note-mover-settings-${new Date().toISOString().split('T')[0]}.json`;
			
			// Trigger download
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			// Clean up
			URL.revokeObjectURL(url);
			
			// Show success message
			NoticeManager.info(
				SETTINGS_CONSTANTS.UI_TEXTS.EXPORT_SUCCESS
			);
		} catch (error) {
			handleError(
				createError(`Export failed: ${error.message}`),
				'Export settings',
				false
			);
		}
	}

	private async importSettings(): Promise<void> {
		try {
			// Create file input element
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.json';
			input.style.display = 'none';
			
			// Add to DOM temporarily
			document.body.appendChild(input);
			
			// Handle file selection
			const file = await new Promise<File>((resolve, reject) => {
				input.onchange = (e) => {
					const target = e.target as HTMLInputElement;
					if (target.files && target.files[0]) {
						resolve(target.files[0]);
					} else {
						reject(new Error('No file selected'));
					}
				};
				input.click();
			});
			
			// Clean up input element
			document.body.removeChild(input);
			
			// Read file content
			const fileContent = await this.readFileAsText(file);
			
			// Parse JSON
			let importedSettings: any;
			try {
				importedSettings = JSON.parse(fileContent);
			} catch (parseError) {
				handleError(
					createError(SETTINGS_CONSTANTS.UI_TEXTS.INVALID_FILE),
					'Import settings',
					false
				);
				return;
			}
			
			// Validate settings
			const validation = SettingsValidator.validateSettings(importedSettings);
			
			if (!validation.isValid) {
				const errorMessage = `${SETTINGS_CONSTANTS.UI_TEXTS.VALIDATION_ERRORS}:\n${validation.errors.join('\n')}`;
				handleError(
					createError(errorMessage),
					'Import settings',
					false
				);
				return;
			}
			
			// Show warnings if any
			if (validation.warnings.length > 0) {
				NoticeManager.warning(
					`Import warnings: ${validation.warnings.join(', ')}`
				);
			}
			
			// Show confirmation modal
			const confirmed = await ConfirmModal.show(this.app, {
				title: SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS_TITLE,
				message: SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS_MESSAGE,
				confirmText: SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS_CONFIRM,
				cancelText: SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SETTINGS_CANCEL,
				danger: true
			});
			
			if (confirmed) {
				// Sanitize and apply settings
				const sanitizedSettings = SettingsValidator.sanitizeSettings(importedSettings);
				
				// Merge with current settings (preserve some fields if needed)
				this.plugin.settings = {
					...this.plugin.settings,
					...sanitizedSettings
				};
				
				// Save settings
				await this.plugin.save_settings();
				
				// Update RuleManager
				this.plugin.noteMover.updateRuleManager();
				
				// Refresh the settings display
				this.display();
				
				// Show success message
				NoticeManager.success(
					SETTINGS_CONSTANTS.UI_TEXTS.IMPORT_SUCCESS
				);
			}
		} catch (error) {
			if (error.message !== 'File selection cancelled') {
				handleError(
					createError(`Import failed: ${error.message}`),
					'Import settings',
					false
				);
			}
		}
	}

	private readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				if (e.target?.result) {
					resolve(e.target.result as string);
				} else {
					reject(new Error('Failed to read file'));
				}
			};
			reader.onerror = () => reject(new Error('Failed to read file'));
			reader.readAsText(file);
		});
	}
}
