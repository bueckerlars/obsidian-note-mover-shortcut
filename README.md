# NoteMover Shortcut
NoteMover Shortcut is a plugin for [Obsidian](https://obsidian.md).

## Description
The "NoteMover Shortcut" plugin streamlines your note organization in Obsidian. It offers a suite of shortcuts to:
- **Move Single Notes**: Swiftly relocate the currently open note to a specified destination folder.
- **Batch Move Notes**: Efficiently transfer all notes from a designated "Inbox" folder to appropriate target folders based on various criteria including tags, properties, file names, content, paths, and dates.

![Plugin Overview](images/noteMover-settings-overview.png)

## Difference to obsidian-auto-note-mover
This plugin focuses on manual control with optional lightweight automation. Unlike obsidian-auto-note-mover, which automatically moves notes on every save, obsidian-note-mover-shortcut allows you to move notes via keyboard shortcut or through periodic scheduled moves.

### Looking ahead:
Large improvements are planned — especially around the rule system, which will allow for even more powerful and flexible note organization in the future.
This will further distinguish this plugin for users who want a balance between structure, automation, and control.

## Configuration
### Settings:

#### Basic Settings
- **Inbox folder**: Specify the path to your inbox folder where new notes are initially stored.
- **Note folder**: Specify the path to your main note folder where notes will be moved to by default.

#### Periodic Movement
![Periodic Movement Settings](images/noteMover-settings-periodic-movement.png)
- **Enable periodic movement**: When enabled, the plugin will automatically move notes from the inbox folder at regular intervals.
- **Periodic movement interval**: Set the interval in minutes between automatic note movements (minimum: 1 minute).

#### Filter Settings
![Filter Settings](images/noteMover-settings-filter.png)
- **Enable filter**: When enabled, you can specify which notes should be moved based on various criteria.
- **Toggle blacklist/whitelist**: Choose between:
  - **Blacklist**: Move all notes EXCEPT those matching the specified criteria
  - **Whitelist**: Move ONLY notes matching the specified criteria
- **Filter criteria**: Add criteria to include/exclude from movement. Supported types:
  - **Tags**: `tag: tagname` - Match notes with specific tags (e.g., `tag: #inbox`, `tag: work/project`)
  - **Properties**: Property-based criteria from frontmatter:
    - `property: key` - Match notes that have the specified property key
    - `property: key:value` - Match notes where the property key has the exact value
    - Example: `property: status:draft`, `property: type:meeting`
  - **File Names**: `fileName: pattern` - Match notes by filename patterns (e.g., `fileName: *.json`, `fileName: Daily`)
  - **Content**: `content: text` - Match notes containing specific text in their content
  - **Path**: `path: folder/path` - Match notes located in specific folder paths
  - **Creation Date**: `created_at: date` - Match notes based on creation date
  - **Update Date**: `updated_at: date` - Match notes based on last modification date

#### Rules
![Rules Configuration](images/noteMover-settings-rules.png)
- **Enable rules**: When enabled, you can define custom rules for moving notes based on various criteria.
- **Rule configuration**: For each rule, specify:
  - **Criteria**: The criteria that triggers the rule. Supported types:
    - **Tags**: `tag: tagname` - Trigger for notes with specific tags
      - Supports subtags (e.g., `tag: work/project` matches both `#work/project` and `#work`)
      - Example: `tag: meeting`, `tag: #inbox`
    - **Properties**: `property: key` or `property: key:value` - Trigger based on frontmatter properties
      - `property: key` - Trigger for notes that have the specified property key
      - `property: key:value` - Trigger for notes where the property key has the exact value
      - Example: `property: type:meeting`, `property: urgent`
    - **File Names**: `fileName: pattern` - Trigger for notes matching filename patterns
      - Supports wildcards (e.g., `fileName: *.json`, `fileName: Daily*`)
      - Example: `fileName: Meeting`, `fileName: *.md`
    - **Content**: `content: text` - Trigger for notes containing specific text
      - Example: `content: TODO`, `content: urgent`
    - **Path**: `path: folder/path` - Trigger for notes in specific locations
      - Example: `path: Inbox/`, `path: Templates/`
    - **Creation Date**: `created_at: date` - Trigger based on when the note was created
    - **Update Date**: `updated_at: date` - Trigger based on when the note was last modified
  - **Path**: The destination folder for notes matching this criteria
  - Note: If a note matches multiple rules, the first matching rule will be applied.
  - Note: Destination folders will be created automatically if they don't exist.

### Example Configurations

#### Advanced Rule Examples
You can use different criteria types for sophisticated note organization:

**Filter Examples**:
- **Whitelist**: `tag: #inbox`, `property: status:draft`, `fileName: *.json`
  - Only moves notes with the inbox tag, OR draft status, OR JSON files
- **Blacklist**: `content: private`, `path: Archive/`
  - Moves all notes EXCEPT those containing "private" or located in Archive folder

**Rules Examples**:
1. `property: type:meeting` → `Meetings/`
2. `fileName: Daily*` → `Daily Notes/`
3. `tag: work/urgent` → `Work/Priority/`
4. `content: TODO` → `Tasks/`
5. `path: Inbox/` → `Processed/`
6. `created_at: 2024-01-01` → `Archive/2024/`

**Complex Workflow Example**:
- **Filter (Whitelist)**: `tag: #process`, `property: status:ready`
- **Rules**:
  1. `property: type:project` → `Projects/Active/`
  2. `fileName: Meeting*` → `Meetings/`
  3. `content: urgent` → `Priority/`
  4. Default: `Processed/`

This setup will only process notes tagged with #process OR having status:ready, then move them based on their type, filename pattern, or content.

### Hotkeys:
- Set Hotkeys to the NoteMover Commands

## Usage
1. **Configuration:** Configure your folders and rules as described in the [Configuration section](#configuration)
2. **Open Note:** Open the note you want to move.
3. **Execute Command:** Execute one of the NoteMover commands from the command palette or use your configured shortcuts.

### Available Commands
![Available Commands](images/noteMover-commands.png)
The plugin provides the following 6 commands that can be accessed through the command palette or configured with custom hotkeys:

#### Move Active Note
- **Command ID**: `trigger-note-movement`
- **Name**: "Move active note to note folder"
- **Description**: Moves the currently active note to the configured note folder. If rules are enabled, the note will be moved according to its criteria. Includes preview functionality to show the destination before moving.
- **Usage**: Open the note you want to move and execute this command.

#### Bulk Move Notes
- **Command ID**: `trigger-note-bulk-move`
- **Name**: "Move all notes from inbox to notes folder"
- **Description**: Moves all notes from the configured inbox folder to their respective destination folders based on the current settings:
  - If rules are enabled, notes will be moved according to their criteria
  - If filters are enabled, only notes matching the filter criteria will be moved
  - Otherwise, all notes will be moved to the default note folder
  - **Preview**: Shows a preview of all files to be moved and their destinations before execution
- **Usage**: Execute this command to process all notes in your inbox folder at once.

#### History and Undo
![History Modal](images/noteMover-modal-history.png)
- **Command ID**: `show-history`
- **Name**: "Show history"
- **Description**: Displays a history of all note movements performed by the plugin, allowing you to review and undo previous actions.
- **Usage**: Execute this command to open the history view, where you can:
  - View a chronological list of all note movements
  - See the source and destination paths for each move
  - Undo individual movements or bulk operations
  - **Bulk Undo**: Select and revert multiple movements at once for efficient history management
  - Filter the history by date or operation type

#### Move Preview
![Move Preview Modal](images/noteMover-modal-movePreview.png)
- **Feature**: File Move Preview
- **Description**: Before executing any move operation, you can preview which files will be moved and where they will be relocated.
- **Benefits**:
  - **Safe Operations**: See exactly what will happen before committing to the move
  - **Bulk Move Confidence**: Preview all files that will be processed in bulk operations
  - **Rule Validation**: Verify that your rules and filters are working as expected
- **Usage**: The preview functionality is automatically triggered before move operations, showing:
  - List of files to be moved
  - Source and destination paths for each file
  - Applied rules or criteria for each move
  - Option to proceed or cancel the operation

#### Show Update Modal
- **Command ID**: `show-update-modal`
- **Name**: "Show update modal"
- **Description**: Manually displays the update modal showing changelog information for the current version.
- **Usage**: Execute this command to view the changelog and update information, useful for reviewing new features and changes.

#### Preview Bulk Movement
- **Command ID**: `preview-bulk-movement`
- **Name**: "Preview bulk movement from inbox"
- **Description**: Shows a preview of all files that would be moved from the inbox folder without actually executing the move operation.
- **Usage**: Execute this command to:
  - See which files would be affected by a bulk move
  - Preview destination paths for each file
  - Review applied rules and filters
  - Plan your bulk operations safely

#### Preview Active Note Movement
- **Command ID**: `preview-note-movement`
- **Name**: "Preview active note movement"
- **Description**: Shows a preview of where the currently active note would be moved based on your current rules and settings.
- **Usage**: Open the note you want to preview and execute this command to:
  - See the destination path before moving
  - Verify that rules are working as expected
  - Make informed decisions about note placement

## Contributing:
This plugin is open-source. Contributions are welcome!

## Features
- **Active Note Move**: Move the active note from the current location to the main notes folder with a single command
- **Bulk Move**: The ability to move all notes from an "Inbox" folder to the main notes folder with a single command, saving you time and simplifying organization.
- **Advanced Criteria-Based Moving**: Move notes to different destination folders based on various criteria including tags, properties (frontmatter), file names, content, paths, and dates, allowing for sophisticated note organization.
- **Automated Moving**: A feature that periodically moves notes from the "Inbox" folder if they meet specific criteria, such as lacking an "#inbox" tag.
- **Move Preview**: Preview which files will be moved before execution, ensuring safe and predictable operations
- **History Tracking**: Keep track of all note movements with a detailed history view
- **Undo Functionality**: Easily revert any note movements if needed, with support for both individual and bulk undo operations
