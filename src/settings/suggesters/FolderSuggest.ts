import { AbstractInputSuggest, App, TAbstractFile, TFolder } from 'obsidian';
import { GENERAL_CONSTANTS } from '../../config/constants';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  private cachedFolders: TFolder[] | null = null;

  constructor(
    app: App,
    private inputEl: HTMLInputElement
  ) {
    super(app, inputEl);
  }

  private getFolders(): TFolder[] {
    if (this.cachedFolders === null) {
      const abstractFiles = this.app.vault.getAllLoadedFiles();
      this.cachedFolders = abstractFiles.filter(
        (f): f is TFolder => f instanceof TFolder
      );
    }
    return this.cachedFolders;
  }

  /** Call when the vault structure changes to rebuild the folder list. */
  public invalidateCache(): void {
    this.cachedFolders = null;
  }

  protected getSuggestions(query: string): TFolder[] | Promise<TFolder[]> {
    const folders = this.getFolders();
    const lowerCaseInputStr = query.toLowerCase();

    const matched: TFolder[] = [];
    for (const folder of folders) {
      if (folder.path.toLowerCase().contains(lowerCaseInputStr)) {
        matched.push(folder);
        if (
          matched.length >=
          GENERAL_CONSTANTS.SUGGESTION_LIMITS.FOLDER_SUGGESTIONS
        ) {
          break;
        }
      }
    }

    return matched;
  }

  renderSuggestion(value: TFolder, el: HTMLElement): void {
    el.setText(value.path);
  }

  selectSuggestion(value: TFolder): void {
    this.setValue(value.path);
    this.inputEl.trigger('input');
    this.close();
  }
}
