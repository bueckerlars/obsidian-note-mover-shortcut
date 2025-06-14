import NoteMoverShortcutPlugin from "main";
import { PluginSettingTab, App, Setting } from "obsidian";
import { FolderSuggest } from "./suggesters/FolderSuggest";
import { TagSuggest } from "./suggesters/TagSuggest";
import { NoteMoverError } from "src/utils/Error";
import { log_error } from "src/utils/Log";
import { v4 as uuidv4 } from 'uuid';
import { InboxSettings } from "./components/InboxSettings";
import { PeriodicMovementSettings } from "./components/PeriodicMovementSettings";
import { FilterSettings } from "./components/FilterSettings";
import { RulesSettings } from "./components/RulesSettings";
import { HistorySettings } from "./components/HistorySettings";
import { Rule, GroupRule, TagRule, Trigger } from "./types";

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
		const { containerEl } = this;
		containerEl.empty();

		// Basic Settings
		new Setting(containerEl).setName('Basic Settings').setHeading();
		
		// Inbox folder
		new Setting(containerEl)
			.setName('Inbox folder')
			.setDesc('Set your inbox folder')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.inboxLocation)
					.onChange(async (new_folder) => {
						this.plugin.settings.inboxLocation = new_folder;
						await this.plugin.save_settings();
					});
			});

		// Note folder
		new Setting(containerEl)
			.setName('Note folder')
			.setDesc('Set your main note folder')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.destination)
					.onChange(async (new_folder) => {
						this.plugin.settings.destination = new_folder;
						await this.plugin.save_settings();
					});
			});

		// Periodic Movement Settings
		new Setting(containerEl).setName('Periodic Movement').setHeading();

		new Setting(containerEl)
			.setName('Enable periodic movement')
			.setDesc('Enable the periodic movement of notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enablePeriodicMovement)
				.onChange(async (value) => {
					this.plugin.settings.enablePeriodicMovement = value;
					await this.plugin.save_settings();
					this.plugin.noteMover.togglePeriodicMovementInterval();
					this.display();
				})
			);
		
		if (this.plugin.settings.enablePeriodicMovement) {
			new Setting(containerEl)
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

		// Filter Settings
		new Setting(containerEl).setName('Filter').setHeading();

		new Setting(containerEl)
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
			new Setting(containerEl)
				.setName('Toggle blacklist/whitelist')
				.setDesc('Toggle between a blacklist or a whitelist')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.isFilterWhitelist)
					.onChange(async (value) => {
						this.plugin.settings.isFilterWhitelist = value;
						await this.plugin.save_settings();
					})
				);
	
			// Filter tags
			this.plugin.settings.filter.forEach((filter, index) => {
				const s = new Setting(containerEl)
					.addSearch((cb) => {
						new TagSuggest(this.app, cb.inputEl);
						cb.setPlaceholder('Tag')
							.setValue(filter)
							.onChange(async (value) => {
								this.plugin.settings.filter[index] = value;
								await this.plugin.save_settings();
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
							this.display();
						})
					);
				s.infoEl.remove();
			});
    
			new Setting(containerEl)
				.addButton(btn => btn
					.setButtonText('Add new filter')
					.setCta()
					.onClick(async () => {
						this.plugin.settings.filter.push('');
						await this.plugin.save_settings();
						this.display();
					})
				);
		}

		// Rules Settings
		new Setting(containerEl).setName('Rules').setHeading();
		const rulesSettings = new RulesSettings(containerEl, this.app, this.plugin);
		rulesSettings.display();

		// History Settings
		new Setting(containerEl).setName('History').setHeading();

		new Setting(containerEl)
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

	private moveFilter(index: number, direction: number) {
		const newIndex = Math.max(0, Math.min(this.plugin.settings.filter.length - 1, index + direction));
		[this.plugin.settings.filter[index], this.plugin.settings.filter[newIndex]] = [this.plugin.settings.filter[newIndex], this.plugin.settings.filter[index]];
		this.plugin.save_settings();
		this.display();
	}
}
