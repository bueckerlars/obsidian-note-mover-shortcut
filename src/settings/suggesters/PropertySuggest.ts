import { App, AbstractInputSuggest } from 'obsidian';
import { MetadataExtractor } from '../../core/MetadataExtractor';
import { collectPropertySamples } from '../../domain/property/extractFrontmatterProperties';
import { inferPropertyTypeFromSamples } from '../../utils/OperatorMapping';
import { stringifyUnknown } from '../../utils/stringify-unknown';
import { SuggestLifecycle } from './suggestLifecycle';
import { viewClearTimeout, viewTimeout } from '../../utils/viewTimers';

export type PropertyType = 'text' | 'number' | 'checkbox' | 'date' | 'list';

export interface PropertyInfo {
  name: string;
  type: PropertyType;
  exampleValue?: string;
}

const REFRESH_DEBOUNCE_MS = 500;

export class PropertySuggest extends AbstractInputSuggest<string> {
  private properties: Map<string, PropertyInfo>;
  private metadataExtractor: MetadataExtractor;
  private refreshDataHandler: () => void;
  private refreshTimerId: number | null = null;
  private dataLoaded = false;
  private readonly lifecycle = new SuggestLifecycle();

  constructor(
    app: App,
    private inputEl: HTMLInputElement
  ) {
    super(app, inputEl);
    this.properties = new Map();
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

  private loadProperties(): void {
    this.properties.clear();
    const propertyValues = collectPropertySamples(
      this.app.vault
        .getMarkdownFiles()
        .map(file => this.app.metadataCache.getFileCache(file)?.frontmatter)
    );

    propertyValues.forEach((values, key) => {
      const propertyType = inferPropertyTypeFromSamples(values);
      this.properties.set(key, {
        name: key,
        type: propertyType,
        exampleValue: this.getExampleValue(values[0]), // Use first value as example
      });
    });
  }

  private isMoreSpecificType(
    currentType: PropertyType,
    newType: PropertyType
  ): boolean {
    // Type hierarchy: checkbox > number > date > list > text
    const typeHierarchy: PropertyType[] = [
      'text',
      'list',
      'date',
      'number',
      'checkbox',
    ];
    return typeHierarchy.indexOf(newType) > typeHierarchy.indexOf(currentType);
  }

  private getExampleValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : '');
    }

    const str = stringifyUnknown(value);
    return str.length > 20 ? str.substring(0, 20) + '...' : str;
  }

  private ensureDataLoaded(): void {
    if (!this.dataLoaded) {
      this.loadProperties();
      this.dataLoaded = true;
    }
  }

  private refreshData(): void {
    this.dataLoaded = false;
  }

  getSuggestions(inputStr: string): string[] {
    this.ensureDataLoaded();
    const lowerInput = inputStr.toLowerCase();
    const suggestions: string[] = [];

    this.properties.forEach((propertyInfo, propertyName) => {
      if (propertyName.toLowerCase().includes(lowerInput)) {
        suggestions.push(propertyName);
      }
    });

    // Sort alphabetically
    return suggestions.sort((a, b) => a.localeCompare(b));
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    const propertyInfo = this.properties.get(value);
    if (propertyInfo) {
      // Create a container for the suggestion
      const container = el.createDiv({
        cls: 'advancedNoteMover-property-suggestion',
      });

      // Property name
      const nameEl = container.createDiv({
        cls: 'advancedNoteMover-property-name',
      });
      nameEl.setText(propertyInfo.name);

      // Property type and example
      const metaEl = container.createDiv({
        cls: 'advancedNoteMover-property-meta',
      });
      metaEl.setText(
        `${propertyInfo.type}${propertyInfo.exampleValue ? ` • ${propertyInfo.exampleValue}` : ''}`
      );
    } else {
      // Fallback if property info not found
      el.setText(value);
    }
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    this.inputEl.trigger('input');
    this.close();
  }

  /**
   * Get property type for a given property name
   * @param propertyName - Name of the property
   * @returns Property type or null if not found
   */
  public getPropertyType(propertyName: string): PropertyType | null {
    const propertyInfo = this.properties.get(propertyName);
    return propertyInfo ? propertyInfo.type : null;
  }

  /**
   * Get all available properties
   * @returns Array of property names
   */
  public getAllProperties(): string[] {
    return Array.from(this.properties.keys()).sort();
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
}
