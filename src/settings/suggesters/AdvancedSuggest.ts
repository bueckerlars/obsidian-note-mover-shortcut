import { App, AbstractInputSuggest, TFolder } from 'obsidian';
import { MetadataExtractor } from '../../core/MetadataExtractor';
import {
  collectPropertySamples,
  propertyValueStrings,
} from '../../domain/property/extractFrontmatterProperties';
import type { PluginVaultIndexCache } from '../../infrastructure/cache/plugin-vault-index-cache';
import { SuggestLifecycle } from './suggestLifecycle';
import { viewClearTimeout, viewTimeout } from '../../utils/viewTimers';

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

const REFRESH_DEBOUNCE_MS = 500;

export class AdvancedSuggest extends AbstractInputSuggest<string> {
  private selectedType: SuggestType | null = null;
  private tags: Set<string> = new Set();
  private folders: TFolder[] = [];
  private fileNames: string[] = [];
  private propertyKeys: Set<string> = new Set();
  private propertyValues: Map<string, Set<string>> = new Map();
  private metadataExtractor: MetadataExtractor;
  private refreshDataHandler: () => void;
  private refreshTimerId: number | null = null;
  private dataLoaded = false;
  private readonly lifecycle = new SuggestLifecycle();

  constructor(
    public app: App,
    private inputEl: HTMLInputElement,
    private vaultIndexCache?: PluginVaultIndexCache
  ) {
    super(app, inputEl);
    this.metadataExtractor = new MetadataExtractor(app);

    // Create debounced handler for cleanup
    this.refreshDataHandler = () => {
      if (this.refreshTimerId !== null) {
        viewClearTimeout(this.refreshTimerId);
      }
      this.refreshTimerId = viewTimeout(() => {
        this.refreshTimerId = null;
        this.refreshData();
      }, REFRESH_DEBOUNCE_MS);
    };

    this.lifecycle.listen(
      this.app.metadataCache,
      'changed',
      this.refreshDataHandler
    );
  }

  private loadTags(): void {
    if (this.vaultIndexCache) {
      this.tags = this.vaultIndexCache.getAllTagsCached(this.app);
    } else {
      this.tags = this.metadataExtractor.extractAllTags();
    }
  }

  private loadFolders(): void {
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    this.folders = abstractFiles.filter(f => f instanceof TFolder);
  }

  private loadFileNames(): void {
    const files = this.vaultIndexCache
      ? this.vaultIndexCache.getMarkdownFilesCached(this.app)
      : this.app.vault.getMarkdownFiles();
    this.fileNames = files.map(f => f.name);
  }

  private ensureDataLoaded(): void {
    if (!this.dataLoaded) {
      this.loadTags();
      this.loadFolders();
      this.loadFileNames();
      this.loadPropertyKeysAndValues();
      this.dataLoaded = true;
    }
  }

  private refreshData(): void {
    this.dataLoaded = false;
  }

  private loadPropertyKeysAndValues(): void {
    if (this.vaultIndexCache) {
      const { keys, valuesByKey } =
        this.vaultIndexCache.getPropertyKeysAndValuesCached(this.app);
      this.propertyKeys = new Set(keys);
      this.propertyValues = new Map();
      for (const [key, set] of valuesByKey) {
        this.propertyValues.set(key, new Set(set));
      }
      return;
    }

    const samples = collectPropertySamples(
      this.app.vault
        .getMarkdownFiles()
        .map(file => this.app.metadataCache.getFileCache(file)?.frontmatter)
    );
    for (const [key, values] of samples) {
      this.propertyKeys.add(key);
      const valueSet = new Set<string>();
      for (const value of values) {
        for (const item of propertyValueStrings(value)) {
          valueSet.add(item);
        }
      }
      this.propertyValues.set(key, valueSet);
    }
  }

  getSuggestions(query: string): string[] {
    this.ensureDataLoaded();
    // Check if a valid type is selected (at the beginning of the query) - case insensitive
    const typeMatch = SUGGEST_TYPES.find(t =>
      query.toLowerCase().startsWith(t.label.toLowerCase())
    );
    if (!typeMatch || query.trim() === '') {
      this.selectedType = null;
      // Show type suggestions
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
    if (this.refreshTimerId !== null) {
      viewClearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    this.lifecycle.destroy();
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
