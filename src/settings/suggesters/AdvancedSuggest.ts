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
  private isDestinationMode = false;

  constructor(
    public app: App,
    private inputEl: HTMLInputElement,
    options?: { destinationMode?: boolean }
  ) {
    super(app, inputEl);
    this.metadataExtractor = new MetadataExtractor(app);
    this.isDestinationMode = options?.destinationMode ?? false;
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

  /**
   * Detects if the cursor is inside template syntax {{...}}
   * Returns information about the template context if cursor is within braces
   */
  private detectTemplateContext(
    query: string,
    cursorPos: number
  ): {
    isInTemplate: boolean;
    templateContent: string;
    templateStart: number;
    templateEnd: number;
    identifier: string;
    hasDefault: boolean;
    isTag: boolean;
    isGetPropertyValue: boolean;
    cursorInIdentifier: boolean;
    cursorInDefault: boolean;
  } {
    // Default return value
    const defaultReturn = {
      isInTemplate: false,
      templateContent: '',
      templateStart: -1,
      templateEnd: -1,
      identifier: '',
      hasDefault: false,
      isTag: false,
      isGetPropertyValue: false,
      cursorInIdentifier: false,
      cursorInDefault: false,
    };

    if (cursorPos < 0 || cursorPos > query.length) {
      return defaultReturn;
    }

    // Find all {{...}} patterns in the query (handle nested braces by matching innermost first)
    const templatePattern = /\{\{([^}]*)\}\}/g;
    let match;
    const templates: Array<{
      start: number;
      end: number;
      content: string;
      contentStart: number;
      contentEnd: number;
    }> = [];

    while ((match = templatePattern.exec(query)) !== null) {
      const fullMatchStart = match.index;
      const fullMatchEnd = match.index + match[0].length;
      const contentStart = fullMatchStart + 2; // After {{
      const contentEnd = fullMatchEnd - 2; // Before }}

      templates.push({
        start: fullMatchStart,
        end: fullMatchEnd,
        content: match[1],
        contentStart,
        contentEnd,
      });
    }

    // Check if cursor is within any template
    for (const template of templates) {
      // Cursor must be between {{ and }} (not on the braces themselves)
      if (cursorPos > template.start && cursorPos < template.end) {
        const content = template.content;

        // Parse template content: identifier|default or tag:name|default or getPropertyValue:identifier|default
        let identifier = content;
        let hasDefault = false;
        let isTag = false;
        let isGetPropertyValue = false;
        let cursorInIdentifier = true;
        let cursorInDefault = false;

        // Check for default value (|default)
        const defaultIndex = content.indexOf('|');
        if (defaultIndex !== -1) {
          hasDefault = true;
          identifier = content.substring(0, defaultIndex);
          const defaultStart = template.contentStart + defaultIndex + 1;
          // Check if cursor is in default section
          if (cursorPos >= defaultStart) {
            cursorInIdentifier = false;
            cursorInDefault = true;
          }
        }

        // Remove getPropertyValue: prefix if present
        if (identifier.startsWith('getPropertyValue:')) {
          isGetPropertyValue = true;
          identifier = identifier.substring('getPropertyValue:'.length);
        }

        // Check if it's a tag reference
        if (identifier.startsWith('tag:')) {
          isTag = true;
          identifier = identifier.substring(4);
        }

        return {
          isInTemplate: true,
          templateContent: content,
          templateStart: template.start,
          templateEnd: template.end,
          identifier: identifier.trim(),
          hasDefault,
          isTag,
          isGetPropertyValue,
          cursorInIdentifier,
          cursorInDefault,
        };
      }
    }

    return defaultReturn;
  }

  getSuggestions(query: string): string[] {
    // Get cursor position to detect template context
    const cursorPos = this.inputEl.selectionStart ?? query.length;

    // Check if cursor is inside template syntax {{...}}
    const templateContext = this.detectTemplateContext(query, cursorPos);

    if (templateContext.isInTemplate) {
      // We're inside a template, provide context-aware suggestions
      if (templateContext.cursorInDefault) {
        // Cursor is in default value section, suggest common default values or property values
        const queryInDefault = templateContext.templateContent
          .substring(templateContext.templateContent.indexOf('|') + 1)
          .toLowerCase();

        // Suggest property values if we have an identifier
        if (templateContext.identifier && !templateContext.isTag) {
          const propertyValues = this.propertyValues.get(
            templateContext.identifier
          );
          if (propertyValues) {
            return Array.from(propertyValues)
              .filter(value => value.toLowerCase().includes(queryInDefault))
              .slice(0, 20);
          }
        }

        // Suggest common default values
        const commonDefaults = [
          'pending',
          'default',
          'unknown',
          'other',
          'none',
        ];
        return commonDefaults
          .filter(d => d.toLowerCase().includes(queryInDefault))
          .slice(0, 10);
      }

      // Cursor is in identifier section
      const queryInIdentifier = templateContext.identifier.toLowerCase();

      // If user typed "tag:", suggest tags
      if (templateContext.isTag || queryInIdentifier.startsWith('tag:')) {
        const tagQuery = queryInIdentifier.startsWith('tag:')
          ? queryInIdentifier.substring(4)
          : queryInIdentifier;
        return Array.from(this.tags)
          .filter(tag => {
            const tagWithoutHash = tag.startsWith('#') ? tag.substring(1) : tag;
            return tagWithoutHash.toLowerCase().includes(tagQuery);
          })
          .map(tag => {
            const tagWithoutHash = tag.startsWith('#') ? tag.substring(1) : tag;
            return `tag:${tagWithoutHash}`;
          })
          .slice(0, 20);
      }

      // If user typed "getPropertyValue:", suggest properties
      if (
        templateContext.isGetPropertyValue ||
        queryInIdentifier.startsWith('getpropertyvalue:')
      ) {
        const propQuery = queryInIdentifier.startsWith('getpropertyvalue:')
          ? queryInIdentifier.substring('getpropertyvalue:'.length)
          : queryInIdentifier;
        return Array.from(this.propertyKeys)
          .filter(key => key.toLowerCase().includes(propQuery))
          .map(key => `getPropertyValue:${key}`)
          .slice(0, 20);
      }

      // Default: suggest property names, tag: prefix, or getPropertyValue: prefix
      const suggestions: string[] = [];

      // Suggest properties
      Array.from(this.propertyKeys)
        .filter(key => key.toLowerCase().includes(queryInIdentifier))
        .forEach(key => suggestions.push(key));

      // Suggest tag: prefix if query matches
      if (
        queryInIdentifier === '' ||
        'tag:'.startsWith(queryInIdentifier.toLowerCase())
      ) {
        suggestions.push('tag:');
      }

      // Suggest getPropertyValue: prefix if query matches
      if (
        queryInIdentifier === '' ||
        'getpropertyvalue:'.startsWith(queryInIdentifier.toLowerCase())
      ) {
        suggestions.push('getPropertyValue:');
      }

      return suggestions.slice(0, 20);
    }

    // If in destination mode and no type match, suggest folders
    if (this.isDestinationMode) {
      const typeMatch = SUGGEST_TYPES.find(t =>
        query.toLowerCase().startsWith(t.label.toLowerCase())
      );
      if (!typeMatch) {
        // No type match in destination mode, suggest folders
        const lowerCaseQuery = query.toLowerCase();
        return this.folders
          .map(f => f.path)
          .filter(path => path.toLowerCase().includes(lowerCaseQuery))
          .slice(0, 50); // Limit folder suggestions
      }
    }

    // Normal criteria suggestions logic
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
    // Get current cursor position and query
    const currentQuery = this.inputEl.value;
    const cursorPos = this.inputEl.selectionStart ?? currentQuery.length;

    // Check if we're selecting a template suggestion (property name inside {{...}})
    const templateContext = this.detectTemplateContext(currentQuery, cursorPos);

    if (templateContext.isInTemplate) {
      // We're inside a template, handle replacement based on context
      const beforeTemplate = currentQuery.substring(
        0,
        templateContext.templateStart
      );
      const afterTemplate = currentQuery.substring(templateContext.templateEnd);

      let newTemplateContent = '';
      let newCursorPos = 0;

      if (templateContext.cursorInDefault) {
        // Cursor is in default section, replace default value
        const defaultIndex = templateContext.templateContent.indexOf('|');
        const identifierPart = templateContext.templateContent.substring(
          0,
          defaultIndex
        );
        newTemplateContent = `${identifierPart}|${value}`;
        newCursorPos =
          templateContext.templateStart + 2 + newTemplateContent.length;
      } else {
        // Cursor is in identifier section
        if (templateContext.hasDefault) {
          // Preserve existing default value
          const defaultIndex = templateContext.templateContent.indexOf('|');
          const defaultPart =
            templateContext.templateContent.substring(defaultIndex);
          newTemplateContent = `${value}${defaultPart}`;
        } else {
          // No default, just replace identifier
          newTemplateContent = value;
        }
        newCursorPos =
          templateContext.templateStart + 2 + newTemplateContent.length;
      }

      const newValue = `${beforeTemplate}{{${newTemplateContent}}}${afterTemplate}`;
      this.inputEl.value = newValue;
      this.inputEl.setSelectionRange(newCursorPos, newCursorPos);
      this.inputEl.trigger('input');
      this.close();
      return;
    }

    // Handle folder selection in destination mode
    if (this.isDestinationMode) {
      const typeMatch = SUGGEST_TYPES.find(t =>
        currentQuery.toLowerCase().startsWith(t.label.toLowerCase())
      );
      if (!typeMatch) {
        // This is a folder suggestion in destination mode
        this.inputEl.value = value;
        this.inputEl.trigger('input');
        this.close();
        return;
      }
    }

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
