import { AbstractInputSuggest, App, TFolder } from 'obsidian';
import { GENERAL_CONSTANTS } from '../../config/constants';
import { MetadataExtractor } from '../../core/MetadataExtractor';
import {
  buildDatePlaceholderSuggestions,
  type DateFormatSeparator,
} from '../../domain/dates/property-date';
import { inferPropertyTypeFromSamples } from '../../utils/OperatorMapping';
import type { PropertyType } from './PropertySuggest';

const FILE_TIMESTAMP_FIELDS = ['created', 'modified'] as const;

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
    }
  | {
      kind: 'fileTemplate';
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
    }
  | {
      type: 'propertyDateComponent';
      propertyName: string;
      search: string;
      formatSeparator: DateFormatSeparator;
    }
  | {
      type: 'file';
      search: string;
    }
  | {
      type: 'fileDateComponent';
      fieldName: (typeof FILE_TIMESTAMP_FIELDS)[number];
      search: string;
      formatSeparator: DateFormatSeparator;
    };

export class FolderSuggest extends AbstractInputSuggest<FolderOrTemplateSuggestion> {
  private cachedFolders: TFolder[] | null = null;
  private metadataExtractor: MetadataExtractor;
  private cachedTags: string[] | null = null;
  private cachedPropertyInfo: Map<string, PropertyType> | null = null;

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
    this.cachedPropertyInfo = null;
  }

  protected getSuggestions(
    query: string
  ): FolderOrTemplateSuggestion[] | Promise<FolderOrTemplateSuggestion[]> {
    const trimmed = query.trim();
    const startIndex = trimmed.lastIndexOf('{{');

    // If the user just started a template with '{{', suggest the available
    // template types (tag / property / file) directly.
    if (startIndex !== -1) {
      const fragment = trimmed.substring(startIndex);
      if (fragment === '{{') {
        return [
          { kind: 'tagTemplate', value: '{{tag.' },
          { kind: 'propertyTemplate', value: '{{property.' },
          { kind: 'fileTemplate', value: '{{file.' },
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
      if (templateContext.type === 'propertyDateComponent') {
        return this.getDateComponentTemplateSuggestions(
          'property',
          templateContext.propertyName,
          templateContext.search,
          templateContext.formatSeparator
        );
      }
      if (templateContext.type === 'file') {
        return this.getFileTemplateSuggestions(templateContext.search);
      }
      if (templateContext.type === 'fileDateComponent') {
        return this.getDateComponentTemplateSuggestions(
          'file',
          templateContext.fieldName,
          templateContext.search,
          templateContext.formatSeparator
        );
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
      case 'tagTemplate':
      case 'propertyTemplate':
      case 'fileTemplate': {
        el.addClass('advancedNoteMover-template-suggestion');
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
    // - {{file.created}}
    // - {{file.created.year}}

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
      const search = this.cleanTemplateSearch(rest, false);
      const colonIndex = search.indexOf(':');
      if (colonIndex > 0) {
        const propertyName = search.substring(0, colonIndex);
        const componentSearch = search.substring(colonIndex + 1).toLowerCase();
        if (this.getPropertyType(propertyName) === 'date') {
          return {
            type: 'propertyDateComponent',
            propertyName,
            search: componentSearch,
            formatSeparator: ':',
          };
        }
      }
      const dotIndex = search.indexOf('.');
      if (dotIndex !== -1) {
        const propertyName = search.substring(0, dotIndex);
        const componentSearch = search.substring(dotIndex + 1).toLowerCase();
        if (this.getPropertyType(propertyName) === 'date') {
          return {
            type: 'propertyDateComponent',
            propertyName,
            search: componentSearch,
            formatSeparator: '.',
          };
        }
      }
      return { type: 'property', search: search.toLowerCase() };
    }

    if (fragment.startsWith('{{file')) {
      let rest = fragment.substring('{{file'.length);
      if (rest.startsWith('.')) {
        rest = rest.substring(1);
      }
      const search = this.cleanTemplateSearch(rest, false);
      const colonIndex = search.indexOf(':');
      if (colonIndex > 0) {
        const fieldName = search.substring(0, colonIndex);
        if (this.isFileTimestampField(fieldName)) {
          return {
            type: 'fileDateComponent',
            fieldName,
            search: search.substring(colonIndex + 1).toLowerCase(),
            formatSeparator: ':',
          };
        }
      }
      const dotIndex = search.indexOf('.');
      if (dotIndex !== -1) {
        const fieldName = search.substring(0, dotIndex);
        if (this.isFileTimestampField(fieldName)) {
          return {
            type: 'fileDateComponent',
            fieldName,
            search: search.substring(dotIndex + 1).toLowerCase(),
            formatSeparator: '.',
          };
        }
      }
      return { type: 'file', search: search.toLowerCase() };
    }

    return null;
  }

  private cleanTemplateSearch(
    rest: string,
    stopOnSlash: boolean = true
  ): string {
    if (!rest) {
      return '';
    }

    const stopChars = stopOnSlash
      ? ['}', '/', ' ', '\t', '\n']
      : ['}', ' ', '\t', '\n'];
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
    const propertyInfo = this.loadPropertyInfo();
    const lowerSearch = search.toLowerCase();
    const suggestions: FolderOrTemplateSuggestion[] = [];

    for (const name of Array.from(propertyInfo.keys()).sort()) {
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

  private getFileTemplateSuggestions(
    search: string
  ): FolderOrTemplateSuggestion[] {
    const lowerSearch = search.toLowerCase();
    const suggestions: FolderOrTemplateSuggestion[] = [];

    for (const field of FILE_TIMESTAMP_FIELDS) {
      if (!lowerSearch || field.startsWith(lowerSearch)) {
        suggestions.push({
          kind: 'fileTemplate',
          value: `{{file.${field}}}`,
        });
      }
    }

    return suggestions;
  }

  private getDateComponentTemplateSuggestions(
    placeholderPrefix: 'property' | 'file',
    keyName: string,
    search: string,
    formatSeparator: DateFormatSeparator
  ): FolderOrTemplateSuggestion[] {
    const suggestions: FolderOrTemplateSuggestion[] = [];
    const kind =
      placeholderPrefix === 'file' ? 'fileTemplate' : 'propertyTemplate';

    for (const value of buildDatePlaceholderSuggestions(
      keyName,
      search,
      formatSeparator,
      placeholderPrefix
    )) {
      suggestions.push({
        kind,
        value,
      });

      if (
        suggestions.length >=
        GENERAL_CONSTANTS.SUGGESTION_LIMITS.FOLDER_SUGGESTIONS
      ) {
        break;
      }
    }

    return suggestions;
  }

  private isFileTimestampField(
    fieldName: string
  ): fieldName is (typeof FILE_TIMESTAMP_FIELDS)[number] {
    return (FILE_TIMESTAMP_FIELDS as readonly string[]).includes(fieldName);
  }

  private getPropertyType(propertyName: string): PropertyType | undefined {
    return this.loadPropertyInfo().get(propertyName);
  }

  private loadPropertyInfo(): Map<string, PropertyType> {
    if (this.cachedPropertyInfo !== null) {
      return this.cachedPropertyInfo;
    }

    const files = this.app.vault.getMarkdownFiles();
    const propertyValues = new Map<string, unknown[]>();

    files.forEach(file => {
      const cachedMetadata = this.app.metadataCache.getFileCache(file);
      if (cachedMetadata?.frontmatter) {
        Object.entries(cachedMetadata.frontmatter).forEach(([key, value]) => {
          if (!key.startsWith('position') && key !== 'tags') {
            if (!propertyValues.has(key)) {
              propertyValues.set(key, []);
            }
            propertyValues.get(key)!.push(value);
          }
        });
      }
    });

    const propertyInfo = new Map<string, PropertyType>();
    propertyValues.forEach((values, key) => {
      propertyInfo.set(key, inferPropertyTypeFromSamples(values));
    });

    this.cachedPropertyInfo = propertyInfo;
    return propertyInfo;
  }
}
