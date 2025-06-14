import { App, Setting } from "obsidian";
import NoteMoverShortcutPlugin from "main";
import { TagSuggest } from "../suggesters/TagSuggest";

export class FilterSettings {
    constructor(
        private containerEl: HTMLElement,
        private app: App,
        private plugin: NoteMoverShortcutPlugin
    ) {}

    display(): void {
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
                        this.display();
                    })
                );
        }
    }

    private add_periodic_movement_filter_array(): void {
        this.plugin.settings.filter.forEach((filter, index) => {
            const s = new Setting(this.containerEl)
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
    }

    private moveFilter(index: number, direction: number) {
        const newIndex = Math.max(0, Math.min(this.plugin.settings.filter.length - 1, index + direction));
        [this.plugin.settings.filter[index], this.plugin.settings.filter[newIndex]] = 
        [this.plugin.settings.filter[newIndex], this.plugin.settings.filter[index]];
        this.plugin.save_settings();
        this.display();
    }
} 