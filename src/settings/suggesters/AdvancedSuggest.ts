import { App, AbstractInputSuggest, TFolder, TAbstractFile, getAllTags } from "obsidian";

export type SuggestType = "tag" | "content" | "fileName" | "created_at" | "path" | "updated_at";

const SUGGEST_TYPES: { label: string, value: SuggestType }[] = [
    { label: "tag: ", value: "tag" },
    { label: "content: ", value: "content" },
    { label: "fileName: ", value: "fileName" },
    { label: "created_at: ", value: "created_at" },
    { label: "path: ", value: "path" },
    { label: "updated_at: ", value: "updated_at" },
];

export class AdvancedSuggest extends AbstractInputSuggest<string> {
    private selectedType: SuggestType | null = null;
    private tags: Set<string> = new Set();
    private folders: TFolder[] = [];
    private fileNames: string[] = [];
    
    constructor(app: App, private inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.loadTags();
        this.loadFolders();
        this.loadFileNames();
    }

    private loadTags(): void {
        const files = this.app.vault.getMarkdownFiles();
        files.forEach(file => {
            const cachedMetadata = this.app.metadataCache.getFileCache(file)!;
            const fileTags = getAllTags(cachedMetadata) || [];
            fileTags.forEach(tag => this.tags.add(tag));
        });
    }

    private loadFolders(): void {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        this.folders = abstractFiles.filter(f => f instanceof TFolder) as TFolder[];
    }

    private loadFileNames(): void {
        const files = this.app.vault.getMarkdownFiles();
        this.fileNames = files.map(f => f.name);
    }

    getSuggestions(query: string): string[] {
        // Prüfe, ob ein gültiger Typ gewählt ist (am Anfang des query)
        const typeMatch = SUGGEST_TYPES.find(t => query.startsWith(t.label));
        if (!typeMatch || query.trim() === "") {
            this.selectedType = null;
            // Typ-Suggestions anzeigen
            return SUGGEST_TYPES
                .filter(t => t.label.toLowerCase().includes(query.toLowerCase()))
                .map(t => t.label);
        } else {
            this.selectedType = typeMatch.value;
            // Typ wurde gewählt, jetzt spezifische Vorschläge
            const q = query.replace(/^[^:]+:\s*/, "").toLowerCase();
            switch (this.selectedType) {
                case "tag":
                    return Array.from(this.tags).filter(tag => tag.toLowerCase().includes(q)).map(tag => `${typeMatch.label}${tag}`);
                case "fileName":
                    return this.fileNames.filter(name => name.toLowerCase().includes(q)).map(name => `${typeMatch.label}${name}`);
                case "path":
                    return this.folders.map(f => f.path).filter(path => path.toLowerCase().includes(q)).map(path => `${typeMatch.label}${path}`);
                case "content":
                    // Platzhalter: Hier könnte man häufige Wörter oder ähnliches vorschlagen
                    return [];
                case "created_at":
                case "updated_at":
                    // Platzhalter: Hier könnte man Datumswerte vorschlagen
                    return [];
                default:
                    return [];
            }
        }
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.setText(value);
    }

    selectSuggestion(value: string): void {
        // Wenn ein Typ gewählt wurde, setze das Feld auf den Typ und lasse weitere Suggestions zu
        const typeMatch = SUGGEST_TYPES.find(t => value === t.label);
        if (typeMatch) {
            this.selectedType = typeMatch.value;
            this.inputEl.value = value;
            this.inputEl.trigger("input");
        } else {
            // Immer sicherstellen, dass das Feld im Format 'typ: value' bleibt
            const currentType = this.selectedType ? SUGGEST_TYPES.find(t => t.value === this.selectedType) : null;
            if (currentType && !value.startsWith(currentType.label)) {
                this.inputEl.value = `${currentType.label}${value}`;
            } else {
                this.inputEl.value = value;
            }
            // Wichtig: input Event triggern, damit onChange in Settings aufgerufen wird
            this.inputEl.trigger("input");
            this.close();
        }
    }
}  