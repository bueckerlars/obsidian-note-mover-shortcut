import { App, CachedMetadata, AbstractInputSuggest, getAllTags } from "obsidian";

export class TagSuggest extends AbstractInputSuggest<string> {
    private tags: Set<string>;

    constructor(app: App, private inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.tags = new Set();
        this.loadTags();
    }
    
    private loadTags(): void {
        const files = this.app.vault.getMarkdownFiles();

        files.forEach(file => {
            const cachedMetadata = this.app.metadataCache.getFileCache(file)!;
            
            const fileTags = getAllTags(cachedMetadata) || [];
            fileTags.forEach(tag => this.tags.add(tag));
        });
    }

    getSuggestions(inputStr: string): string[] {
        const lowerInput = inputStr.toLowerCase();
        return Array.from(this.tags).filter(tag => tag.toLowerCase().includes(lowerInput));
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.setText(value);
    }

    selectSuggestion(value: string): void {
        this.inputEl.value = value;
        this.inputEl.trigger("input");
        this.close();
    }
}
