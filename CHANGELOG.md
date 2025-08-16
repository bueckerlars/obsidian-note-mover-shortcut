# Changelog

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