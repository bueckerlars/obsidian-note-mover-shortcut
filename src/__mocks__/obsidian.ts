export class App {
    vault: any;
    metadataCache: any;
}

export class PluginSettingTab {
    constructor(app: App, plugin: any) {}
}

export class Setting {
    constructor(containerEl: HTMLElement) {}
    setName(name: string): Setting { return this; }
    setDesc(desc: string): Setting { return this; }
    addSearch(cb: (cb: any) => void): Setting { return this; }
    addToggle(cb: (toggle: any) => void): Setting { return this; }
    addText(cb: (text: any) => void): Setting { return this; }
    addButton(cb: (button: any) => void): Setting { return this; }
    addExtraButton(cb: (button: any) => void): Setting { return this; }
}

export class AbstractInputSuggest<T> {
    constructor(app: App, inputEl: HTMLInputElement) {}
    protected getSuggestions(inputStr: string): T[] { return []; }
    renderSuggestion(value: T, el: HTMLElement): void {}
    selectSuggestion(value: T): void {}
    close(): void {}
}

export class TFolder {
    path: string;
    constructor(path: string) {
        this.path = path;
    }
}

export class TFile {
    path: string;
    constructor(path: string) {
        this.path = path;
    }
}

export class TAbstractFile {
    path: string;
    constructor(path: string) {
        this.path = path;
    }
}

export function getAllTags(cache: any): string[] {
    return [];
} 