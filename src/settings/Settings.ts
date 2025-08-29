import NoteMoverShortcutPlugin from "main";
import { PluginSettingTab, App, Setting } from "obsidian";
import { FolderSuggest } from "./suggesters/FolderSuggest";
import { TagSuggest } from "./suggesters/TagSuggest";
import { NoteMoverError } from "src/utils/Error";
import { log_error } from "src/utils/Log";
import { HistoryEntry } from '../types/HistoryEntry';

interface Rule {
	criteria: string, // Format: "type: value" (z.B. "tag: #project", "fileName: notes.md")
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
	history?: HistoryEntry[],
	lastSeenVersion?: string,
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings = {
	destination: '/',
	inboxLocation: '',
	enablePeriodicMovement: false,
	periodicMovementInterval: 5,
	enableFilter: false,
	filter: [],
	isFilterWhitelist: false,
	enableRules: false,
	rules: [],
}

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
	}

	add_inbox_folder_setting(): void {
		new Setting(this.containerEl)
			.setName('Inbox folder')
			.setDesc('Set your inbox folder')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: folder1/folder2')
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
				cb.setPlaceholder("Example: folder1/folder2")
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
					.setPlaceholder('5')
					.setValue(this.plugin.settings.periodicMovementInterval.toString())
					.onChange(async (value) => {
						const interval = parseInt(value);
						if (isNaN(interval)) {
							log_error(new NoteMoverError('Interval must be a number'));
							return;
						}
						if (interval < 1) {
							log_error(new NoteMoverError('Interval must be greater than 0'));
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
					// AdvancedSuggest statt TagSuggest
					new (require("./suggesters/AdvancedSuggest")).AdvancedSuggest(this.app, cb.inputEl);
					cb.setPlaceholder('Filter (z.B. tag:, fileName:, path:, property:, ...)')
						.setValue(filter || "")
						.onChange(async (value) => {
							// Leere Filter nicht speichern
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
					// AdvancedSuggest statt TagSuggest
					new (require("./suggesters/AdvancedSuggest")).AdvancedSuggest(this.app, cb.inputEl);
					cb.setPlaceholder('Criteria (z.B. tag:, fileName:, path:, property:, ...)')
						.setValue(rule.criteria)
						.onChange(async (value) => {
							if (value && this.plugin.settings.rules.some(
								(rule) => rule.criteria === value
							)
							) {
								log_error(
									new NoteMoverError(
										"This criteria already has a folder associated with it"
									)
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
					cb.setPlaceholder('Path')
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
				.setButtonText('Clear history')
				.setWarning()
				.onClick(async () => {
					if (confirm('Are you sure you want to clear the history? This action cannot be undone.')) {
						await this.plugin.historyManager.clearHistory();
					}
				})
			);
	}
}
