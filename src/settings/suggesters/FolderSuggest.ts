import { AbstractInputSuggest, App, TFolder } from 'obsidian';
import { GENERAL_CONSTANTS } from '../../config/constants';
import { MetadataExtractor } from '../../core/MetadataExtractor';

type FolderOrTemplateSuggestion =
  | {
      kind: 'folder';
      folder: TFolder;
    }
  | {
      kind: 'tagTemplate';
      value: string;
    }
  | {
      kind: 'propertyTemplate';
      value: string;
    };

type TemplateContext =
  | {
      type: 'tag';
      search: string;
    }
  | {
      type: 'property';
      search: string;
    };

export class FolderSuggest extends AbstractInputSuggest<FolderOrTemplateSuggestion> {
  private cachedFolders: TFolder[] | null = null;
  private metadataExtractor: MetadataExtractor;
  private cachedTags: string[] | null = null;
  private cachedProperties: string[] | null = null;

  constructor(
    app: App,
    private inputEl: HTMLInputElement
  ) {
    super(app, inputEl);
    this.metadataExtractor = new MetadataExtractor(app);
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
    this.cachedTags = null;
    this.cachedProperties = null;
  }

  protected getSuggestions(
    query: string
  ): FolderOrTemplateSuggestion[] | Promise<FolderOrTemplateSuggestion[]> {
    const trimmed = query.trim();
    const startIndex = trimmed.lastIndexOf('{{');

    // If the user just started a template with '{{', suggest the available
    // template types (tag / property) directly.
    if (startIndex !== -1) {
      const fragment = trimmed.substring(startIndex);
      if (fragment === '{{') {
        return [
          { kind: 'tagTemplate', value: '{{tag.' },
          { kind: 'propertyTemplate', value: '{{property.' },
        ];
      }
    }

    const templateContext = this.extractTemplateContext(query);

    if (templateContext) {
      if (templateContext.type === 'tag') {
        return this.getTagTemplateSuggestions(templateContext.search);
      }
      if (templateContext.type === 'property') {
        return this.getPropertyTemplateSuggestions(templateContext.search);
      }
    }

    // Default: folder suggestions (existing behaviour)
    const folders = this.getFolders();
    const lowerCaseInputStr = query.toLowerCase();

    const matched: FolderOrTemplateSuggestion[] = [];
    for (const folder of folders) {
      if (folder.path.toLowerCase().contains(lowerCaseInputStr)) {
        matched.push({ kind: 'folder', folder });
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

  renderSuggestion(value: FolderOrTemplateSuggestion, el: HTMLElement): void {
    switch (value.kind) {
      case 'folder': {
        el.setText(value.folder.path);
        break;
      }
      case 'tagTemplate': {
        el.addClass('noteMover-template-suggestion');
        el.setText(value.value);
        break;
      }
      case 'propertyTemplate': {
        el.addClass('noteMover-template-suggestion');
        el.setText(value.value);
        break;
      }
    }
  }

  selectSuggestion(value: FolderOrTemplateSuggestion): void {
    if (value.kind === 'folder') {
      this.setValue(value.folder.path);
      this.inputEl.trigger('input');
      this.close();
      return;
    }

    const current = this.inputEl.value;
    const templateStart = current.lastIndexOf('{{');

    if (templateStart >= 0) {
      const prefix = current.substring(0, templateStart);
      this.setValue(prefix + value.value);
    } else {
      this.setValue(value.value);
    }

    this.inputEl.trigger('input');

    // If the user selected a bare starter template that ends with a dot (e.g. "{{tag." or "{{property."),
    // keep the suggester open and immediately show the next level of suggestions.
    if (value.value.endsWith('.')) {
      this.open();
      return;
    }

    this.close();
  }

  private extractTemplateContext(query: string): TemplateContext | null {
    const trimmed = query.trim();
    const startIndex = trimmed.lastIndexOf('{{');

    if (startIndex === -1) {
      return null;
    }

    const fragment = trimmed.substring(startIndex);

    // Handle variants like:
    // - {{tag.tasks}}
    // - {{tag.tasks}}/Archive
    // - {{property.status}}
    // - {{property.status}}/Something

    if (fragment.startsWith('{{tag')) {
      let rest = fragment.substring('{{tag'.length); // may start with "." or "}}"
      if (rest.startsWith('.')) {
        rest = rest.substring(1);
      }
      const search = this.cleanTemplateSearch(rest);
      return { type: 'tag', search: search.toLowerCase() };
    }

    if (fragment.startsWith('{{property')) {
      let rest = fragment.substring('{{property'.length);
      if (rest.startsWith('.')) {
        rest = rest.substring(1);
      }
      const search = this.cleanTemplateSearch(rest);
      return { type: 'property', search: search.toLowerCase() };
    }

    return null;
  }

  private cleanTemplateSearch(rest: string): string {
    if (!rest) {
      return '';
    }

    const stopChars = ['}', '/', ' ', '\t', '\n'];
    let endIndex = rest.length;

    for (const ch of stopChars) {
      const idx = rest.indexOf(ch);
      if (idx !== -1 && idx < endIndex) {
        endIndex = idx;
      }
    }

    return rest.substring(0, endIndex);
  }

  private getTagTemplateSuggestions(
    search: string
  ): FolderOrTemplateSuggestion[] {
    if (this.cachedTags === null) {
      const tagSet = this.metadataExtractor.extractAllTags();
      this.cachedTags = Array.from(tagSet);
    }

    const lowerSearch = search.toLowerCase();
    const suggestions: FolderOrTemplateSuggestion[] = [];

    for (const tag of this.cachedTags) {
      if (!lowerSearch || tag.toLowerCase().includes(lowerSearch)) {
        const cleaned = tag.startsWith('#') ? tag.substring(1) : tag;
        suggestions.push({
          kind: 'tagTemplate',
          value: `{{tag.${cleaned}}}`,
        });

        if (
          suggestions.length >=
          GENERAL_CONSTANTS.SUGGESTION_LIMITS.FOLDER_SUGGESTIONS
        ) {
          break;
        }
      }
    }

    return suggestions;
  }

  private getPropertyTemplateSuggestions(
    search: string
  ): FolderOrTemplateSuggestion[] {
    if (this.cachedProperties === null) {
      this.cachedProperties = this.loadProperties();
    }

    const lowerSearch = search.toLowerCase();
    const suggestions: FolderOrTemplateSuggestion[] = [];

    for (const name of this.cachedProperties) {
      if (!lowerSearch || name.toLowerCase().includes(lowerSearch)) {
        suggestions.push({
          kind: 'propertyTemplate',
          value: `{{property.${name}}}`,
        });

        if (
          suggestions.length >=
          GENERAL_CONSTANTS.SUGGESTION_LIMITS.FOLDER_SUGGESTIONS
        ) {
          break;
        }
      }
    }

    return suggestions;
  }

  private loadProperties(): string[] {
    const files = this.app.vault.getMarkdownFiles();
    const propertyNames = new Set<string>();

    files.forEach(file => {
      const cachedMetadata = this.app.metadataCache.getFileCache(file);
      if (cachedMetadata?.frontmatter) {
        Object.keys(cachedMetadata.frontmatter).forEach(key => {
          if (!key.startsWith('position') && key !== 'tags') {
            propertyNames.add(key);
          }
        });
      }
    });

    return Array.from(propertyNames).sort();
  }
}
