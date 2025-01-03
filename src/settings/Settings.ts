import NoteMoverShortcutPlugin from "main";
import { PluginSettingTab, App, Setting } from "obsidian";
import { FolderSuggest } from "./suggesters/FolderSuggest";

export interface NoteMoverShortcutSettings {
	destination: string,
	inboxLocation: string,
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings = {
	destination: '/',
	inboxLocation: '',
}

export class NoteMoverShortcutSettingsTab extends PluginSettingTab {
	plugin: NoteMoverShortcutPlugin;

	constructor(app: App, plugin: NoteMoverShortcutPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
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

		new Setting(containerEl)
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
                cb.containerEl.addClass("templater_search");
            });
	}
}
