import { App, Notice } from "obsidian";
import { TextInputSuggest } from "./suggest";

export class TagSuggest extends TextInputSuggest<string> {
    constructor(app: App, inputEl: HTMLInputElement | HTMLTextAreaElement) {
        super(app, inputEl);
    }

    getSuggestions(inputStr: string): string[] {
        const tags = this.getAllTags();
        const lowerCaseInputStr = inputStr.toLowerCase();

        return tags.filter(tag => tag.toLowerCase().includes(lowerCaseInputStr));
    }

    renderSuggestion(tag: string, el: HTMLElement): void {
        el.setText(tag);
    }

    selectSuggestion(tag: string): void {
        this.inputEl.value = tag;
        this.inputEl.trigger("input");
        this.close();
    }

    private getAllTags(): string[] {
        const tagsSet = new Set(); // Vermeidung von Duplikaten
        const files = this.app.vault.getFiles(); // Alle Dateien im Vault abrufen

        files.forEach((file) => {
            const fileCache = this.app.metadataCache.getFileCache(file); // Metadaten für die Datei abrufen
            if (fileCache && fileCache.tags) {
                fileCache.tags.forEach(tagObj => {
                    tagsSet.add(tagObj.tag); // Tags zum Set hinzufügen
                });
            }
        });

        return Array.from(tagsSet) as string[]; // Set in Array umwandeln und zurückgeben
    }
}