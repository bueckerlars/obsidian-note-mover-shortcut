# Changelog

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