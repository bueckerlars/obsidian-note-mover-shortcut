import { App, Setting } from "obsidian";
import { FolderSuggest } from "../suggesters/FolderSuggest";
import NoteMoverShortcutPlugin from "main";

export class InboxSettings {
    constructor(
        private containerEl: HTMLElement,
        private app: App,
        private plugin: NoteMoverShortcutPlugin
    ) {}

    display(): void {
        this.add_inbox_folder_setting();
        this.add_target_folder_setting();
    }

    private add_inbox_folder_setting(): void {
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

    private add_target_folder_setting(): void {
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
} 