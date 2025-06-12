// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { App, AbstractInputSuggest } from "obsidian";

export abstract class TextInputSuggest<T> extends AbstractInputSuggest<T> {
    public app: App;
    public inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.app = app;
        this.inputEl = inputEl;
    }

    abstract getSuggestions(inputStr: string): T[];
    abstract renderSuggestion(item: T, el: HTMLElement): void;
    abstract selectSuggestion(item: T): void;
}