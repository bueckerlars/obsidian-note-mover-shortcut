import { App, AbstractInputSuggest } from 'obsidian';

export class PropertyValueSuggest extends AbstractInputSuggest<string> {
  private propertyName: string;
  private propertyType: 'text' | 'number' | 'checkbox' | 'date' | 'list';
  private availableValues: Set<string>;

  constructor(
    app: App,
    private inputEl: HTMLInputElement,
    propertyName: string,
    propertyType: 'text' | 'number' | 'checkbox' | 'date' | 'list'
  ) {
    super(app, inputEl);
    this.propertyName = propertyName;
    this.propertyType = propertyType;
    this.loadAvailableValues();
  }

  private loadAvailableValues(): void {
    this.availableValues = new Set();

    // Keine Vorschläge für Date-Typ
    if (this.propertyType === 'date') {
      return;
    }

    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.[this.propertyName] !== undefined) {
        const value = cache.frontmatter[this.propertyName];
        this.addValueToSuggestions(value);
      }
    }
  }

  private addValueToSuggestions(value: any): void {
    switch (this.propertyType) {
      case 'text':
        if (typeof value === 'string' && value.trim()) {
          this.availableValues.add(value.trim());
        }
        break;

      case 'number':
        if (typeof value === 'number') {
          this.availableValues.add(value.toString());
        } else if (typeof value === 'string' && this.isNumberString(value)) {
          this.availableValues.add(value.trim());
        }
        break;

      case 'checkbox':
        if (typeof value === 'boolean') {
          this.availableValues.add(value.toString());
        } else if (typeof value === 'string' && this.isBooleanString(value)) {
          this.availableValues.add(value.trim().toLowerCase());
        }
        break;

      case 'list':
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
              this.availableValues.add(item.trim());
            }
          });
        } else if (typeof value === 'string' && this.isListProperty(value)) {
          const parts = value
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0);
          parts.forEach(part => this.availableValues.add(part));
        }
        break;

      case 'date':
        // Keine Vorschläge für Date-Typ
        break;
    }
  }

  private isNumberString(value: string): boolean {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      return !isNaN(num) && isFinite(num);
    }
    return false;
  }

  private isBooleanString(value: string): boolean {
    const trimmed = value.trim().toLowerCase();
    return (
      trimmed === 'true' ||
      trimmed === 'false' ||
      trimmed === 'yes' ||
      trimmed === 'no' ||
      trimmed === 'on' ||
      trimmed === 'off' ||
      trimmed === '1' ||
      trimmed === '0'
    );
  }

  private isListProperty(value: any): boolean {
    if (Array.isArray(value)) {
      return true;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed.includes(',')) {
        const parts = trimmed
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0);
        if (parts.length > 1) {
          return true;
        }
      }

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return true;
      }

      if (trimmed.includes('\n-') || trimmed.startsWith('-')) {
        return true;
      }
    }

    return false;
  }

  getSuggestions(inputStr: string): string[] {
    // Keine Vorschläge für Date-Typ
    if (this.propertyType === 'date') {
      return [];
    }

    const lowerInput = inputStr.toLowerCase();
    const suggestions: string[] = [];

    this.availableValues.forEach(value => {
      if (value.toLowerCase().includes(lowerInput)) {
        suggestions.push(value);
      }
    });

    // Sort alphabetically
    return suggestions.sort((a, b) => a.localeCompare(b));
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    // Create a container for the suggestion
    const container = el.createDiv({
      cls: 'noteMover-property-value-suggestion',
    });

    // Value text
    const valueEl = container.createDiv({
      cls: 'noteMover-property-value-text',
    });
    valueEl.setText(value);

    // Type indicator
    const typeEl = container.createDiv({
      cls: 'noteMover-property-value-type',
    });
    typeEl.setText(`(${this.propertyType})`);
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    this.inputEl.trigger('input');
    this.close();
  }

  /**
   * Update the property name and type, then reload suggestions
   * @param propertyName - New property name
   * @param propertyType - New property type
   */
  public updateProperty(
    propertyName: string,
    propertyType: 'text' | 'number' | 'checkbox' | 'date' | 'list'
  ): void {
    this.propertyName = propertyName;
    this.propertyType = propertyType;
    this.loadAvailableValues();
  }

  /**
   * Refresh suggestions when metadata changes
   */
  public refreshSuggestions(): void {
    this.loadAvailableValues();
  }
}
