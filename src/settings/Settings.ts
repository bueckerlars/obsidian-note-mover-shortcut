import NoteMoverShortcutPlugin from "main";
import { PluginSettingTab, App, Setting } from "obsidian";
import { FolderSuggest } from "./suggesters/FolderSuggest";
import { TagSuggest } from "./suggesters/TagSuggest";

interface Rule {
	tag: string,
	path: string,
}

export interface NoteMoverShortcutSettings {
	destination: string,
	inboxLocation: string,
	enableRules: boolean,
	rules: Rule[],
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings = {
	destination: '/',
	inboxLocation: '',
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
				// @ts-ignore
				cb.containerEl.addClass("note_mover_search");
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
				// @ts-ignore
				cb.containerEl.addClass("note_mover_search");
			});
	}

	add_rules_setting(): void {
		new Setting(this.containerEl)
			.setName('Toggle Rules')
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
}
