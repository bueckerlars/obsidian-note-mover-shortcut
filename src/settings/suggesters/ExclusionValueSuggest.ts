import { AbstractInputSuggest, App, getAllTags } from 'obsidian';
import {
  countValues,
  rankSuggestions,
  type CountedSuggestion,
  type ExclusionKind,
} from '../../domain/filters/exclusionFilter';
import { plural } from '../../i18n/locale';

/** Vault values for the exclusion value field, each with the number of notes it covers. */
export class ExclusionValueSuggest extends AbstractInputSuggest<CountedSuggestion> {
  private cache: { kind: ExclusionKind; counts: Map<string, number> } | null =
    null;

  constructor(
    app: App,
    private readonly inputEl: HTMLInputElement,
    private readonly getKind: () => ExclusionKind
  ) {
    super(app, inputEl);
  }

  /** Call when the type changes. */
  reset(): void {
    this.cache = null;
  }

  protected getSuggestions(query: string): CountedSuggestion[] {
    const kind = this.getKind();
    if (this.cache?.kind !== kind) {
      this.cache = { kind, counts: this.collect(kind) };
    }
    return rankSuggestions(this.cache.counts, query);
  }

  renderSuggestion(item: CountedSuggestion, el: HTMLElement): void {
    el.setText(item.value);
    el.createEl('small', {
      cls: 'advancedNoteMover-suggest-count',
      text: plural(item.count, 'note'),
    });
  }

  selectSuggestion(item: CountedSuggestion): void {
    this.inputEl.value = item.value;
    this.inputEl.trigger('input');
    this.close();
  }

  private collect(kind: ExclusionKind): Map<string, number> {
    const { vault, metadataCache } = this.app;
    const files = vault.getMarkdownFiles();
    switch (kind) {
      case 'tag':
        return countValues(
          files.map(file => {
            const cache = metadataCache.getFileCache(file);
            return (cache && getAllTags(cache)) ?? [];
          })
        );
      case 'folder':
        return countValues(
          files.map(file => {
            const paths: string[] = [];
            for (
              let dir = file.parent;
              dir && !dir.isRoot();
              dir = dir.parent
            ) {
              paths.push(dir.path);
            }
            return paths;
          })
        );
      case 'fileName':
        return countValues(files.map(file => [file.name]));
      case 'property':
        return countValues(
          files.map(file => {
            const frontmatter = metadataCache.getFileCache(file)?.frontmatter;
            return frontmatter
              ? Object.keys(frontmatter).filter(key => key !== 'position')
              : [];
          })
        );
      default:
        return new Map();
    }
  }
}
