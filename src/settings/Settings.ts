import NoteMoverShortcutPlugin from "main";
import { PluginSettingTab, App, Setting } from "obsidian";
import { FolderSuggest } from "./suggesters/FolderSuggest";
import { TagSuggest } from "./suggesters/TagSuggest";
import { NoteMoverError } from "src/utils/Error";
import { log_error } from "src/utils/Log";

interface Rule {
	tag: string,
	path: string,
}

export interface NoteMoverShortcutSettings {
	destination: string,
	inboxLocation: string,
	enablePeriodicMovement: boolean,
	periodicMovementInterval: number,
	periodicMovementFilter: string[],
	periodicMovementFilterWhitelist: boolean,
	enableRules: boolean,
	rules: Rule[],
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings = {
	destination: '/',
	inboxLocation: '',
	enablePeriodicMovement: false,
	periodicMovementInterval: 5,
	periodicMovementFilter: [],
	periodicMovementFilterWhitelist: false,
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

		this.add_rules_setting();
		if (this.plugin.settings.enableRules) {
			this.add_rules_array();
			this.add_add_rule_button_setting();
		}
	}

	add_inbox_folder_setting(): void {
		new Setting(this.containerEl)
			.setName('Inbox Folder')
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
			.setName('Note Folder')
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
		new Setting(this.containerEl).setName('Periodic Movement').setHeading();

		new Setting(this.containerEl)
			.setName('Enable Periodic Movement')
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
				.setName('Periodic Movement Interval')
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

			// Filter settings
			new Setting(this.containerEl)
				.setName("Toggle Blacklist/Whitelist")
				.setDesc("Toggle between a blacklist or a whitelist")
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.periodicMovementFilterWhitelist)
					.onChange(async (value) => {
						this.plugin.settings.periodicMovementFilterWhitelist = value;
						await this.plugin.save_settings();
					})
				);
			
			this.add_periodic_movement_filter_array();

			new Setting(this.containerEl)
				.addButton(btn => btn
					.setButtonText('Add new Filter')
					.setCta()
					.onClick(() => {
						this.plugin.settings.periodicMovementFilter.push('');
						this.display();
					})
				);
		}
	}

	add_periodic_movement_filter_array(): void {
		this.plugin.settings.periodicMovementFilter.forEach((filter, index) => {
			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					new TagSuggest(this.app, cb.inputEl);
					cb.setPlaceholder('Tag')
						.setValue(filter)
						.onChange(async (value) => {
							this.plugin.settings.periodicMovementFilter[index] = value;
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
					.onClick(() => {
						this.plugin.settings.periodicMovementFilter.splice(index, 1);
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
			'When enabled, the NoteMover will move notes to the folder associated with the tag.',
			document.createElement('br'),
			'If a note contains more than one tag associated with a rule, the first rule will be applied.',
		);

		new Setting(this.containerEl)
			.setName('Enalbe Rules')
			.setDesc(descUseRules)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableRules)
				.onChange(async (value) => {
					this.plugin.settings.enableRules = value;
					await this.plugin.save_settings();
					this.display();
				})
			);
	}

	add_add_rule_button_setting(): void {
		new Setting(this.containerEl)
			.addButton(btn => btn
				.setButtonText('Add new Rule')
				.setCta()
				.onClick(() => {
					this.plugin.settings.rules.push({ tag: '', path: '' });
					this.display();
				})
			);
	}

	add_rules_array(): void {
		this.plugin.settings.rules.forEach((rule, index) => {
			const s = new Setting(this.containerEl)
				.addSearch((cb) => {
					new TagSuggest(this.app, cb.inputEl);
					cb.setPlaceholder('Tag')
						.setValue(rule.tag)
						.onChange(async (value) => {
							if (value && this.plugin.settings.rules.some(
								(rule) => rule.tag === value
							)
							) {
								log_error(
									new NoteMoverError(
										"This tag already has a folder associated with it"
									)
								);
								return;
							}

							// Save Setting
							this.plugin.settings.rules[index].tag = value;
							await this.plugin.save_settings();
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
					.onClick(() => {
						this.plugin.settings.rules.splice(index, 1);
						this.display();
					})
				);
				s.infoEl.remove();
			});
	}

	moveRule(index: number, direction: number) {
		const newIndex = Math.max(0, Math.min(this.plugin.settings.rules.length - 1, index + direction));
		[this.plugin.settings.rules[index], this.plugin.settings.rules[newIndex]] = [this.plugin.settings.rules[newIndex], this.plugin.settings.rules[index]];
		this.display();
	  }

	moveFilter(index: number, direction: number) {
		const newIndex = Math.max(0, Math.min(this.plugin.settings.periodicMovementFilter.length - 1, index + direction));
		[this.plugin.settings.periodicMovementFilter[index], this.plugin.settings.periodicMovementFilter[newIndex]] = [this.plugin.settings.periodicMovementFilter[newIndex], this.plugin.settings.periodicMovementFilter[index]];
		this.display();
	}
}
