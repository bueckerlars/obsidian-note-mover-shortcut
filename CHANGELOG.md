# Changelog

## [0.5.0](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.7...0.5.0)

### Features

- **RuleV2 System (Beta)**: Complete rewrite of the rule matching system with advanced trigger-based logic
  - **New Criteria Types**: Support for `fileName`, `folder`, `extension`, `links`, `embeds`, `headings`, `properties`, `created_at`, `modified_at`
  - **Advanced Operators**: Type-specific operators for text, list, date, and property matching
    - Text operators: `is`, `contains`, `starts with`, `ends with`, `match regex`
    - List operators: `includes item`, `all are`, `any contain`, `count is`, etc.
    - Date operators: `is before/after`, `date is today`, `is under X days ago`, component matching
    - Property operators: Runtime type-checking with support for text, number, checkbox, date, and list properties
  - **Aggregation Logic**: Support for `all`, `any`, and `none` aggregation modes across multiple triggers
  - **Feature Flag**: Toggle between RuleV1 and RuleV2 systems via `enableRuleV2` setting
  - **Backward Compatibility**: RuleV1 system remains fully functional when RuleV2 is disabled
  - **Performance Optimizations**: Regex caching, efficient metadata extraction, and optimized matching algorithms

### Changes

- **Metadata Extraction**: Enhanced `MetadataExtractor` with V2-specific fields (`extension`, `links`, `embeds`, `headings`)
- **Rule Management**: New `RuleManagerV2` class with advanced preview and validation capabilities
- **Type Safety**: Full TypeScript type safety with CriteriaType-to-Operator mapping
- **Error Handling**: Graceful handling of invalid regex patterns and malformed data

## [0.4.7](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.6...0.4.7)

### Features

### Changes

- Marked NoteMoverSettings interface as deprecated
- Refactoring to use the new PluginData interface

### Fixes

- Fixed SettingsValidator to accept both deprecated and new settings data structure
- Enabled notifications on periodic movements
- Improved performance of On-Edit Trigger

## [0.4.6](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.5...0.4.6)

### Features

- Added `Add current file to blacklist` command.
- Added new action button on history entries to add the file to blacklist

### Changes

- Removed `FilerMode` setting and reworked filter logic to work always if mode is set to blacklist

## [0.4.5](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.4...0.4.5)

### Fixes

- Rule Matching: RuleMatcher now leverages MetadataExtractor to support list-property matching via parseListProperty/isListProperty.
- Debounced Rendering: Introduce DebounceManager; SettingsTab refreshes via debounced display() and provides cleanup().
- Memory Safety: FilterSettingsSection/RulesSettingsSection track AdvancedSuggest instances and DragDropManager; added cleanup() and proper refresh after DnD save.

## [0.4.4](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.3...0.4.4)

### Features

- Implemented check if note is in the correct folder already before move
- Implemented drag&drop reordering for rules and filters

### Bug Fixes

- Fixed skipping of already moved files
- Fixed filter blacklist for folders [#33](https://github.com/bueckerlars/obsidian-note-mover-shortcut/issues/33)

## [0.4.3](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.2...0.4.3)

### Changes

- Removed `onlyMoveNotesWithRules` setting

### Fixes

- Bulk moves skip notes that are in the correct folder already

### Improvements

- The `UpdateMangager` gets a dynamic on build-time generated changelog instead of a copy from the `CHANGELOG.md`

## [0.4.2](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.1...0.4.2)

### Features

- Added an option for "on-edit" note movement
- Changed the filter whitelist/blacklist toggle to a dropdown

## Changes

- Renamed the periodic movement settings section to trigger section
- Implemented an event system for periodic movements and on-edit movement

## [0.4.1](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.4.0...0.4.1)

> Attention: Breaking Changes

### Changes

- Removed inbox and notes folder settings
- Added setting for history rentention policy and dropdown in the history modal to select timespan of the entries shown

## [0.4.0](https://github.com/bueckerlars/obsidian-note-mover-shortcut/compare/0.3.4...0.4.0)

### Features

- Added a button for opening notes in the `History Modal`
- Added Wildcard and Regex matching for filenames in the rules
- Added Settings for importing and exporting settings

### Changes

- Implemented comprehensive codebase refactoring for improved maintainability and performance
- Added new `FileMovementService` class for unified file movement operations
  - Centralized file movement logic with plugin move tracking
  - Enhanced folder creation and batch operation support
  - Improved error handling and history integration
- Introduced `MetadataExtractor` class for standardized file metadata access
  - Efficient extraction of file metadata, tags, and frontmatter properties
  - Optimized performance for large vaults with caching mechanisms
- Created new `RuleMatcher` class for advanced rule and filter matching
  - Hierarchical tag matching with specificity-based rule sorting
  - Enhanced wildcard pattern matching for file names
  - Improved frontmatter property evaluation
- Added `BaseModal` class for consistent modal UI across the plugin
  - Standardized modal creation and styling
  - Improved user experience with consistent design patterns
- Implemented `NoticeManager` class for unified notification system
  - Customizable notice types with undo functionality
  - Enhanced error reporting and user feedback

### Improvements

- Refactored all modal classes to extend `BaseModal` for consistency
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
  - New `property:` criteria type for filtering and moving notes based on frontmatter metadata
  - Support for exact value matching (`property:key:value`) and existence checking (`property:key`)
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
- Added command to move all files from inbox to notes folder
