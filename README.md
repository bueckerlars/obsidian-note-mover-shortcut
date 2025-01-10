# NoteMover Shortcut
NoteMover Shortcut is a plugin for [Obsidian](https://obsidian.md).

## Description
The "NoteMover Shortcut" plugin streamlines your note organization in Obsidian. It offers a suite of shortcuts to:
- **Move Single Notes**: Swiftly relocate the currently open note to a specified destination folder.
- **Batch Move Notes**: Efficiently transfer all notes from a designated "Inbox" folder to appropriate target folders based on tags.

## Installation
### Community Plugins:
1. Access Obsidian's settings.
2. Navigate to "Community Plugins".
3. Enable "Safe mode" and install the plugin using "Browse".
### Manual Installation:
1. Download the plugin as a ZIP file.
2. Unzip the ZIP file into your Obsidian vault under .obsidian/plugins/note-mover-shortcut.
3. Restart Obsidian.

## Configuration
### Settings:
- **Inbox Folder:** Specify the path to your inbox folder.
- **Base Note Folder:** Specify the path to your base note folder.
- **(Optional) Rules:** Define your rules to customize even more
### Hotkeys:
- Set Hotkeys to the NoteMover Commands

## Usage
1. **Configuration:** Configure your folders and rule as described in the [Configuration section](#configuration)
1. **Open Note:** Open the note you want to move.
2. **Execute Command:** Execute one the NoteMover commands from the command palatte or configure a shortcut

## Contributing:
This plugin is open-source. Contributions are welcome!

## Features
- **Active Note Move**: Move the active note from the current location to the main notes folder with a single command
- **Bulk Move**: The ability to move all notes from an "Inbox" folder to the main notes folder with a single command, saving you time and simplifying organization.
- **Tag-Based Moving**: Move notes to different destination folders based on their tags, allowing for even more granular organization of your notes.
- **Automated Moving**: A feature that periodically moves notes from the "Inbox" folder if they meet specific criteria, such as lacking an "#inbox" tag.
