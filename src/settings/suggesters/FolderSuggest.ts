import { AbstractInputSuggest, App, TAbstractFile, TFolder } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {

    constructor(app: App, private inputEl: HTMLInputElement) {
        super(app, inputEl);
    }

    protected getSuggestions(query: string): TFolder[] | Promise<TFolder[]> {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerCaseInputStr = query.toLowerCase();

        abstractFiles.forEach((folder: TAbstractFile) => {
            if (
                folder instanceof TFolder &&
                folder.path.toLowerCase().contains(lowerCaseInputStr)
            ) {
                folders.push(folder);
            }
        });

        return folders.slice(0, 1000);
    }

    renderSuggestion(value: TFolder, el: HTMLElement): void {
        el.setText(value.path);
    }

    selectSuggestion(value: TFolder): void {
        this.setValue(value.path);
        this.inputEl.trigger("input");
        this.close();
    }
}
