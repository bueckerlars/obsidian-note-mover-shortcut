import { App, AbstractInputSuggest } from 'obsidian';
import { MetadataExtractor } from '../../core/MetadataExtractor';
import { inferPropertyTypeFromSamples } from '../../utils/OperatorMapping';

export type PropertyType = 'text' | 'number' | 'checkbox' | 'date' | 'list';

export interface PropertyInfo {
  name: string;
  type: PropertyType;
  exampleValue?: string;
}

export class PropertySuggest extends AbstractInputSuggest<string> {
  private properties: Map<string, PropertyInfo>;
  private metadataExtractor: MetadataExtractor;
  private refreshDataHandler: () => void;

  constructor(
    app: App,
    private inputEl: HTMLInputElement
  ) {
    super(app, inputEl);
    this.properties = new Map();
    this.metadataExtractor = new MetadataExtractor(app);
    this.loadProperties();

    // Create bound handler for cleanup
    this.refreshDataHandler = () => this.refreshData();

    // Listen for metadata changes to refresh suggestions
    this.app.metadataCache.on('changed', this.refreshDataHandler);
  }

  private loadProperties(): void {
    this.properties.clear();
    const files = this.app.vault.getMarkdownFiles();

    // First pass: collect all property values
    const propertyValues = new Map<string, any[]>();

    files.forEach(file => {
      const cachedMetadata = this.app.metadataCache.getFileCache(file);
      if (cachedMetadata?.frontmatter) {
        Object.entries(cachedMetadata.frontmatter).forEach(([key, value]) => {
          // Skip Obsidian internal properties
          if (!key.startsWith('position') && key !== 'tags') {
            if (!propertyValues.has(key)) {
              propertyValues.set(key, []);
            }
            propertyValues.get(key)!.push(value);
          }
        });
      }
    });

    // Second pass: determine types and create property info
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

  private getExampleValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : '');
    }

    const str = String(value);
    return str.length > 20 ? str.substring(0, 20) + '...' : str;
  }

  private refreshData(): void {
    this.loadProperties();
  }

  getSuggestions(inputStr: string): string[] {
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
      const container = el.createDiv({ cls: 'noteMover-property-suggestion' });

      // Property name
      const nameEl = container.createDiv({ cls: 'noteMover-property-name' });
      nameEl.setText(propertyInfo.name);

      // Property type and example
      const metaEl = container.createDiv({ cls: 'noteMover-property-meta' });
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
    this.app.metadataCache.off('changed', this.refreshDataHandler);
  }
}
