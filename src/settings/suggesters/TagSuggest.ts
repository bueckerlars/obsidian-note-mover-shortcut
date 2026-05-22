import { App, AbstractInputSuggest } from 'obsidian';
import { MetadataExtractor } from '../../core/MetadataExtractor';
import type { PluginVaultIndexCache } from '../../infrastructure/cache/plugin-vault-index-cache';

export class TagSuggest extends AbstractInputSuggest<string> {
  private tags: Set<string>;
  private metadataExtractor: MetadataExtractor;

  constructor(
    app: App,
    private inputEl: HTMLInputElement,
    private vaultIndexCache?: PluginVaultIndexCache
  ) {
    super(app, inputEl);
    this.tags = new Set();
    this.metadataExtractor = new MetadataExtractor(app);
    this.loadTags();
  }

  private loadTags(): void {
    if (this.vaultIndexCache) {
      this.tags = this.vaultIndexCache.getAllTagsCached(this.app);
    } else {
      this.tags = this.metadataExtractor.extractAllTags();
    }
  }

  getSuggestions(inputStr: string): string[] {
    const lowerInput = inputStr.toLowerCase();
    return Array.from(this.tags).filter(tag =>
      tag.toLowerCase().includes(lowerInput)
    );
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    this.inputEl.trigger('input');
    this.close();
  }
}
