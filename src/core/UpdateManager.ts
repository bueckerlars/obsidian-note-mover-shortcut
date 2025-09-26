import { TFile } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';
import { UpdateModal } from '../modals/UpdateModal';
import { NoticeManager } from '../utils/NoticeManager';
import { RuleMatcher } from './RuleMatcher';
import { FileMovementService } from './FileMovementService';
import { BaseModal } from 'src/modals/BaseModal';
import { MetadataExtractor } from './MetadataExtractor';

interface ChangelogEntry {
  version: string;
  changes: {
    features?: string[];
    bugFixes?: string[];
    improvements?: string[];
  };
}

export class UpdateManager {
  private plugin: NoteMoverShortcutPlugin;

  constructor(plugin: NoteMoverShortcutPlugin) {
    this.plugin = plugin;
  }

  /**
   * Checks if the plugin has been updated and shows the UpdateModal
   */
  async checkForUpdates(): Promise<void> {
    const currentVersion = this.plugin.manifest.version;
    const lastSeenVersion = this.plugin.settings.lastSeenVersion;

    // On first start or when a new version is detected
    if (
      !lastSeenVersion ||
      this.isNewerVersion(currentVersion, lastSeenVersion)
    ) {
      await this.showUpdateModal();
    }
  }

  /**
   * Shows the UpdateModal (can also be called manually)
   * @param forceShow If true, the modal will be shown even if the version has already been seen
   */
  async showUpdateModal(forceShow = false): Promise<void> {
    const currentVersion = this.plugin.manifest.version;
    let lastSeenVersion = this.plugin.settings.lastSeenVersion;

    // For manual invocation (forceShow), use an older version as base,
    // to ensure relevant information is displayed
    if (forceShow && lastSeenVersion === currentVersion) {
      // Use an older version as base for display
      lastSeenVersion = '0.1.6';
    }

    const changelogEntries = await this.getRelevantChangelogEntries(
      lastSeenVersion,
      currentVersion
    );

    // UpdateModal anzeigen
    const updateModal = new UpdateModal(
      this.plugin.app,
      currentVersion,
      lastSeenVersion || '',
      changelogEntries
    );
    updateModal.open();

    // Only mark version as "seen" on automatic call
    if (!forceShow) {
      this.plugin.settings.lastSeenVersion = currentVersion;
      await this.plugin.save_settings();
    }
  }

  /**
   * Vergleicht zwei Versionsstrings
   * @param current The current version
   * @param last The last seen version
   * @returns true if current is newer than last
   */
  private isNewerVersion(current: string, last: string): boolean {
    const parseVersion = (version: string): number[] => {
      return version.split('.').map(v => parseInt(v) || 0);
    };

    const currentParts = parseVersion(current);
    const lastParts = parseVersion(last);

    // Ensure same length for comparison
    const maxLength = Math.max(currentParts.length, lastParts.length);
    while (currentParts.length < maxLength) currentParts.push(0);
    while (lastParts.length < maxLength) lastParts.push(0);

    for (let i = 0; i < maxLength; i++) {
      if (currentParts[i] > lastParts[i]) return true;
      if (currentParts[i] < lastParts[i]) return false;
    }

    return false; // Versions are equal
  }

  /**
   * Loads relevant changelog entries between two versions
   * @param fromVersion The start version (exclusive)
   * @param toVersion The end version (inclusive)
   * @returns Array of changelog entries
   */
  private async getRelevantChangelogEntries(
    fromVersion: string | undefined,
    toVersion: string
  ): Promise<ChangelogEntry[]> {
    try {
      const changelogContent = await this.loadChangelogContent();
      if (!changelogContent) {
        return [];
      }

      return this.parseChangelog(changelogContent, fromVersion, toVersion);
    } catch (error) {
      NoticeManager.error(
        `Fehler beim Laden des Changelogs: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Loads the content of the CHANGELOG.md file
   */
  private async loadChangelogContent(): Promise<string | null> {
    // Since the CHANGELOG.md is located in the plugin directory, not in the vault,
    // we embed the content directly here
    return `# Changelog
## [0.4.2](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.1...0.4.2)
### Features
- Added an option for "on-edit" note movement
- Changed the filter whitelist/blacklist toggle to a dropdown 

## Changes
- Renamed the periodic movement settings section to trigger section
- Implemented an event system for periodic movements and on-edit movement

## [0.4.1](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.0...0.4.1)

> Attention: Breaking Changes

### Features
- Removed inbox and notes folder settings 
- Added setting for history rentention policy and dropdown in the history modal to select timespan of the entries shown

## [0.4.0](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.3.4...0.4.0)
### Features
- Added a button for opening notes in the \`History Modal\`
- Added Wildcard and Regex matching for filenames in the rules 
- Added Settings for importing and exporting settings 

### Changes
- Implemented comprehensive codebase refactoring for improved maintainability and performance
- Added new \`FileMovementService\` class for unified file movement operations
  - Centralized file movement logic with plugin move tracking
  - Enhanced folder creation and batch operation support
  - Improved error handling and history integration
- Introduced \`MetadataExtractor\` class for standardized file metadata access
  - Efficient extraction of file metadata, tags, and frontmatter properties
  - Optimized performance for large vaults with caching mechanisms
- Created new \`RuleMatcher\` class for advanced rule and filter matching
  - Hierarchical tag matching with specificity-based rule sorting
  - Enhanced wildcard pattern matching for file names
  - Improved frontmatter property evaluation
- Added \`BaseModal\` class for consistent modal UI across the plugin
  - Standardized modal creation and styling
  - Improved user experience with consistent design patterns
- Implemented \`NoticeManager\` class for unified notification system
  - Customizable notice types with undo functionality
  - Enhanced error reporting and user feedback

### Improvements
- Refactored all modal classes to extend \`BaseModal\` for consistency
- Enhanced error handling with standardized error creation and management
- Improved test coverage with comprehensive unit tests for new classes
- Added configuration constants for better maintainability
- Optimized suggestion systems with improved metadata extraction
- Enhanced path utilities with new helper functions
- Improved code organization and separation of concerns

### Bug Fixes
- Fixed various edge cases in file movement operations
- Improved error handling for folder creation failures
- Enhanced undo functionality for complex file operations
- Fixed issues with metadata extraction in edge cases

## [0.3.4](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.3.3...0.3.4)
### Features
- Added "Only move notes with rules" option #21
  - New toggle in Rules settings to control note movement behavior
  - When enabled: Only notes matching defined rules will be moved, others remain untouched
  - When disabled: Notes without matching rules are moved to the default destination folder
  - Provides flexibility for users who want selective note processing based on rules

### Improvements
- Enhanced rule processing logic to support selective note movement
- Updated preview functionality to reflect the new movement behavior
- Improved user experience with clear option descriptions and conditional UI display

## [0.3.3](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.3.2...0.3.3)
### Features
- Implemented file move preview functionality to show which files will be moved before execution
- Added bulk undo functionality to history for reverting multiple movements at once
- Added custom confirmation modal

### Bug Fixes
- Fixed bug where undo was failing with notes that are moved to subfolders by rules
- Small styling fixes for preview modal

### Improvements
- Enhanced test coverage and improved mock data in tests

## [0.3.2](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.3.1...0.3.2)
### Features
- Added support for Properties (Frontmatter) in Rules and Filters #20
  - New \`property:\` criteria type for filtering and moving notes based on frontmatter metadata
  - Support for exact value matching (\`property:key:value\`) and existence checking (\`property:key\`)
  - Case-insensitive property value comparison with support for different data types
- Enhanced property suggestions with three-level autocomplete
  - Intelligent suggestion hierarchy: type → property key → property value
  - Auto-completion of property keys and values from vault analysis
  - Seamless UX with automatic colon insertion after property key selection

### Improvements
- Extended AdvancedSuggest with comprehensive property value tracking
- Updated UI placeholders and descriptions to include property examples
- Added comprehensive test coverage for property-based functionality

## [0.3.1](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.3.0...0.3.1)
### Features
- Implemented support for subtags in rules #19
- Implemented creation of destination folders that do not exist when moving notes

## [0.3.0](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.2.1...0.3.0)
### Features
- Implemented update modal that shows changelog information for new versions
- Added advanced filter system with intelligent suggestors for folders and tags
- Implemented advanced suggest system for rule settings
- Added automatic history event listener for tracking manual file operations
- Command to manually show update modal for viewing changelog

### Improvements
- Refactored rule code to make iterations and maintenance easier
- Improved test coverage and updated test implementation for new filter settings
- Enhanced user experience with better autocomplete suggestions

## [0.2.1](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.2.0...0.2.1)
### Bug Fixes
- Fixed config gets overwrited on history changes #17

## [0.2.0](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.1.7...0.2.0)
### Features
- Implemented movement history
- Added modal to show the history and revert movements
- Added Notice for single move command with undo option

## [0.1.7](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.1.6...0.1.7)
### Bug Fixes
- Fixed issues mentioned in PR obsidianmd/obsidian-releases#6028

## [0.1.6](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.1.5...0.1.6)
### Bug Fixes
- Removed path import for mobile support
- Refactored suggestors with AbstractInputSuggest
- Use getAllTags() method for getting tags to insure tags are used from file and frontmatter
- Fixed UI texts with sentece case
- Removed use of innerHTML from log functions

## [0.1.5](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.1.4...0.1.5)
### Features
- Added periodic movement options to settings 
- Implemented timer function 
- Added filter options to settings 
- Added heading to periodic movement setting 
- Implemented filter setting
- Added periodic movement enabled on plugin startup

### Bug Fixes
- Fixed skip if whitelist and no tags
- Fixed filter code and added skip option for manuell note movement
- Fixed typo in settings
- Fixed interaval reset

## [0.1.4](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.1.4...0.1.5)
### Features
- Added rules section to settings
- Added TagSuggest
- Implemented note movement based on rules
- Updated README with updated description
- Added custom log classes

## [0.1.3](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.1.2...0.1.3) (2025-01-03)

### Bug Fixes
- Renamed setting for notes folder
- Set default value for notes folder to vault root

### Features
- Added inbox folder setting
- Added command to move all files from inbox to notes folder`;
  }

  /**
   * Parses the changelog content and extracts relevant versions
   */
  private parseChangelog(
    content: string,
    fromVersion: string | undefined,
    toVersion: string
  ): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const lines = content.split('\n');

    let currentVersion = '';
    let currentChanges: ChangelogEntry['changes'] = {};
    let currentSection: 'features' | 'bugFixes' | 'improvements' | null = null;

    for (const line of lines) {
      // Recognize version header (e.g. "## [0.2.1]" or "## [0.1.6]")
      const versionMatch = line.match(/^##\s*\[?(\d+\.\d+\.\d+)\]?/);
      if (versionMatch) {
        // Vorherige Version speichern, falls vorhanden
        if (
          currentVersion &&
          this.shouldIncludeVersion(currentVersion, fromVersion, toVersion)
        ) {
          entries.push({
            version: currentVersion,
            changes: { ...currentChanges },
          });
        }

        // Neue Version starten
        currentVersion = versionMatch[1];
        currentChanges = {};
        currentSection = null;
        continue;
      }

      // Abschnitt-Header erkennen
      if (line.startsWith('### Features')) {
        currentSection = 'features';
        currentChanges.features = [];
        continue;
      }
      if (line.startsWith('### Bug Fixes')) {
        currentSection = 'bugFixes';
        currentChanges.bugFixes = [];
        continue;
      }
      if (
        line.startsWith('### Improvements') ||
        line.startsWith('### Performance')
      ) {
        currentSection = 'improvements';
        currentChanges.improvements = [];
        continue;
      }

      // Collect changelog entries
      if (currentSection && line.startsWith('- ')) {
        const changeText = line.substring(2).trim();
        if (changeText) {
          currentChanges[currentSection]?.push(changeText);
        }
      }
    }

    // Letzte Version speichern
    if (
      currentVersion &&
      this.shouldIncludeVersion(currentVersion, fromVersion, toVersion)
    ) {
      entries.push({
        version: currentVersion,
        changes: { ...currentChanges },
      });
    }

    return entries;
  }

  /**
   * Determines if a version should be included in the changelog entries
   */
  private shouldIncludeVersion(
    version: string,
    fromVersion: string | undefined,
    toVersion: string
  ): boolean {
    // Always include the current version
    if (version === toVersion) {
      return true;
    }

    // If no fromVersion (first start), show the last important versions
    if (!fromVersion) {
      // Define important versions that should be shown on first start
      const importantVersionsToShow = [
        '0.3.4',
        '0.3.3',
        '0.3.0',
        '0.2.1',
        '0.2.0',
        '0.1.7',
        '0.1.6',
      ];
      return importantVersionsToShow.includes(version);
    }

    // Version must be between fromVersion (exclusive) and toVersion (inclusive)
    return (
      this.isNewerVersion(version, fromVersion) &&
      (version === toVersion || this.isNewerVersion(toVersion, version))
    );
  }
}
