import { App, AbstractInputSuggest, TFolder, TAbstractFile } from 'obsidian';
import { MetadataExtractor } from '../../core/MetadataExtractor';

export type SuggestType =
  | 'tag'
  | 'content'
  | 'fileName'
  | 'created_at'
  | 'path'
  | 'updated_at'
  | 'property';

const SUGGEST_TYPES: { label: string; value: SuggestType }[] = [
  { label: 'tag: ', value: 'tag' },
  { label: 'content: ', value: 'content' },
  { label: 'fileName: ', value: 'fileName' },
  { label: 'created_at: ', value: 'created_at' },
  { label: 'path: ', value: 'path' },
  { label: 'updated_at: ', value: 'updated_at' },
  { label: 'property: ', value: 'property' },
];

export class AdvancedSuggest extends AbstractInputSuggest<string> {
  private selectedType: SuggestType | null = null;
  private tags: Set<string> = new Set();
  private folders: TFolder[] = [];
  private fileNames: string[] = [];
  private propertyKeys: Set<string> = new Set();
  private propertyValues: Map<string, Set<string>> = new Map();
  private metadataExtractor: MetadataExtractor;
  private refreshDataHandler: () => void;

  constructor(
    public app: App,
    private inputEl: HTMLInputElement
  ) {
    super(app, inputEl);
    this.metadataExtractor = new MetadataExtractor(app);
    this.loadTags();
    this.loadFolders();
    this.loadFileNames();
    this.loadPropertyKeysAndValues();

    // Create bound handler for cleanup
    this.refreshDataHandler = () => this.refreshData();

    // Listen for metadata changes to refresh suggestions
    this.app.metadataCache.on('changed', this.refreshDataHandler);
  }

  private loadTags(): void {
    this.tags = this.metadataExtractor.extractAllTags();
  }

  private loadFolders(): void {
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    this.folders = abstractFiles.filter(f => f instanceof TFolder) as TFolder[];
  }

  private loadFileNames(): void {
    const files = this.app.vault.getMarkdownFiles();
    this.fileNames = files.map(f => f.name);
  }

  private refreshData(): void {
    this.loadTags();
    this.loadFolders();
    this.loadFileNames();
    this.loadPropertyKeysAndValues();
  }

  private loadPropertyKeysAndValues(): void {
    const files = this.app.vault.getMarkdownFiles();
    files.forEach(file => {
      const cachedMetadata = this.app.metadataCache.getFileCache(file);
      if (cachedMetadata?.frontmatter) {
        Object.entries(cachedMetadata.frontmatter).forEach(([key, value]) => {
          // Skip Obsidian internal properties
          if (!key.startsWith('position') && key !== 'tags') {
            this.propertyKeys.add(key);

            // Collect values for this property
            if (!this.propertyValues.has(key)) {
              this.propertyValues.set(key, new Set());
            }

            // Handle different value types
            if (value !== null && value !== undefined) {
              // Check if this is a list property
              if (this.metadataExtractor.isListProperty(value)) {
                // Parse list property and add individual values
                const listItems =
                  this.metadataExtractor.parseListProperty(value);
                listItems.forEach(item => {
                  this.propertyValues.get(key)!.add(item);
                });
              } else {
                // Regular single value
                const valueStr = String(value);
                this.propertyValues.get(key)!.add(valueStr);
              }
            }
          }
        });
      }
    });
  }

  getSuggestions(query: string): string[] {
    // Check if a valid type is selected (at the beginning of the query) - case insensitive
    const typeMatch = SUGGEST_TYPES.find(t =>
      query.toLowerCase().startsWith(t.label.toLowerCase())
    );
    if (!typeMatch || query.trim() === '') {
      this.selectedType = null;
      // Typ-Suggestions anzeigen
      return SUGGEST_TYPES.filter(
        t =>
          query.trim() === '' ||
          t.label.toLowerCase().includes(query.toLowerCase())
      ).map(t => t.label);
    } else {
      this.selectedType = typeMatch.value;

      // Special handling for property type with potential key:value structure
      if (this.selectedType === 'property') {
        return this.getPropertySuggestions(query, typeMatch.label);
      }

      // Type was selected, now provide specific suggestions
      const q = query.replace(/^[^:]+:\s*/i, '').toLowerCase();
      switch (this.selectedType) {
        case 'tag':
          return Array.from(this.tags)
            .filter(tag => tag.toLowerCase().includes(q))
            .map(tag => `${typeMatch.label}${tag}`);
        case 'fileName':
          return this.fileNames
            .filter(name => name.toLowerCase().includes(q))
            .map(name => `${typeMatch.label}${name}`);
        case 'path':
          return this.folders
            .map(f => f.path)
            .filter(path => path.toLowerCase().includes(q))
            .map(path => `${typeMatch.label}${path}`);
        case 'content':
          // Placeholder: Here we could suggest common words or similar
          return [];
        case 'created_at':
        case 'updated_at':
          // Placeholder: Here we could suggest date values
          return [];
        default:
          return [];
      }
    }
  }

  private getPropertySuggestions(query: string, typeLabel: string): string[] {
    // Remove "property: " prefix
    const afterType = query.substring(typeLabel.length);

    // Check if we already have a property key with colon (property:key:)
    const colonIndex = afterType.indexOf(':');

    if (colonIndex === -1) {
      // No colon yet, suggest property keys
      const q = afterType.toLowerCase();
      return Array.from(this.propertyKeys)
        .filter(key => key.toLowerCase().includes(q))
        .map(key => `${typeLabel}${key}`);
    } else {
      // We have property:key:, now suggest values for this key
      const propertyKey = afterType.substring(0, colonIndex);
      const valueQuery = afterType
        .substring(colonIndex + 1)
        .trim()
        .toLowerCase();

      const valuesForKey = this.propertyValues.get(propertyKey);
      if (valuesForKey) {
        // Sort values alphabetically for better UX
        const sortedValues = Array.from(valuesForKey).sort((a, b) =>
          a.localeCompare(b)
        );

        return sortedValues
          .filter(value => value.toLowerCase().includes(valueQuery))
          .map(value => `${typeLabel}${propertyKey}: ${value}`);
      }
      return [];
    }
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  /**
   * Cleanup method to remove event listeners
   * Should be called when the suggest is no longer needed
   */
  public destroy(): void {
    this.app.metadataCache.off('changed', this.refreshDataHandler);
  }

  selectSuggestion(value: string): void {
    // If a type was selected, set the field to the type and allow further suggestions
    const typeMatch = SUGGEST_TYPES.find(t => value === t.label);
    if (typeMatch) {
      this.selectedType = typeMatch.value;
      this.inputEl.value = value;
      this.inputEl.trigger('input');
      return;
    }

    // Special handling for property suggestions
    if (this.selectedType === 'property' && value.startsWith('property: ')) {
      const afterType = value.substring('property: '.length);
      const colonCount = (afterType.match(/:/g) || []).length;

      if (colonCount === 0) {
        // This is a property key, allow further input for values
        this.inputEl.value = value + ':';
        this.inputEl.trigger('input');
        return;
      } else {
        // This is a complete property:key:value, finalize selection
        this.inputEl.value = value;
        this.inputEl.trigger('input');
        this.close();
        return;
      }
    }

    // Default handling for other types
    const currentType = this.selectedType
      ? SUGGEST_TYPES.find(t => t.value === this.selectedType)
      : null;
    if (currentType && !value.startsWith(currentType.label)) {
      this.inputEl.value = `${currentType.label}${value}`;
    } else {
      this.inputEl.value = value;
    }
    // Important: trigger input event so onChange in Settings is called
    this.inputEl.trigger('input');
    this.close();
  }
}
