import NoteMoverShortcutPlugin from "main";
import { App, Setting } from "obsidian";
import { FolderSuggest } from "../suggesters/FolderSuggest";
import { SETTINGS_CONSTANTS } from "../../config/constants";

export class FolderSettingsSection {
	constructor(
		private plugin: NoteMoverShortcutPlugin,
		private containerEl: HTMLElement
	) {}

	addInboxFolderSetting(): void {
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

	addTargetFolderSetting(): void {
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

	private get app(): App {
		return this.plugin.app;
	}
}
