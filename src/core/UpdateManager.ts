import { TFile } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';
import { UpdateModal } from '../modals/UpdateModal';

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
     * Überprüft, ob das Plugin aktualisiert wurde und zeigt das UpdateModal an
     */
    async checkForUpdates(): Promise<void> {
        const currentVersion = this.plugin.manifest.version;
        const lastSeenVersion = this.plugin.settings.lastSeenVersion;

        // Beim ersten Start oder wenn eine neue Version erkannt wird
        if (!lastSeenVersion || this.isNewerVersion(currentVersion, lastSeenVersion)) {
            await this.showUpdateModal();
        }
    }

    /**
     * Zeigt das UpdateModal an (kann auch manuell aufgerufen werden)
     * @param forceShow Wenn true, wird das Modal auch angezeigt wenn die Version bereits gesehen wurde
     */
    async showUpdateModal(forceShow: boolean = false): Promise<void> {
        const currentVersion = this.plugin.manifest.version;
        let lastSeenVersion = this.plugin.settings.lastSeenVersion;
        
        // Beim manuellen Aufruf (forceShow) verwende eine ältere Version als Basis,
        // um sicherzustellen, dass relevante Informationen angezeigt werden
        if (forceShow && lastSeenVersion === currentVersion) {
            // Verwende eine ältere Version als Basis für die Anzeige
            lastSeenVersion = '0.1.6';
        }
        
        const changelogEntries = await this.getRelevantChangelogEntries(lastSeenVersion, currentVersion);
        
        // UpdateModal anzeigen
        const updateModal = new UpdateModal(
            this.plugin.app,
            currentVersion,
            lastSeenVersion || '',
            changelogEntries
        );
        updateModal.open();

        // Nur beim automatischen Aufruf die Version als "gesehen" markieren
        if (!forceShow) {
            this.plugin.settings.lastSeenVersion = currentVersion;
            await this.plugin.save_settings();
        }
    }

    /**
     * Vergleicht zwei Versionsstrings
     * @param current Die aktuelle Version
     * @param last Die zuletzt gesehene Version
     * @returns true wenn current neuer ist als last
     */
    private isNewerVersion(current: string, last: string): boolean {
        const parseVersion = (version: string): number[] => {
            return version.split('.').map(v => parseInt(v) || 0);
        };

        const currentParts = parseVersion(current);
        const lastParts = parseVersion(last);

        // Gleiche Länge für Vergleich sicherstellen
        const maxLength = Math.max(currentParts.length, lastParts.length);
        while (currentParts.length < maxLength) currentParts.push(0);
        while (lastParts.length < maxLength) lastParts.push(0);

        for (let i = 0; i < maxLength; i++) {
            if (currentParts[i] > lastParts[i]) return true;
            if (currentParts[i] < lastParts[i]) return false;
        }

        return false; // Versionen sind gleich
    }

    /**
     * Lädt relevante Changelog-Einträge zwischen zwei Versionen
     * @param fromVersion Die Startversion (exklusiv)
     * @param toVersion Die Endversion (inklusiv)
     * @returns Array von Changelog-Einträgen
     */
    private async getRelevantChangelogEntries(fromVersion: string | undefined, toVersion: string): Promise<ChangelogEntry[]> {
        try {
            const changelogContent = await this.loadChangelogContent();
            if (!changelogContent) {
                return [];
            }

            return this.parseChangelog(changelogContent, fromVersion, toVersion);
        } catch (error) {
            console.error('Fehler beim Laden des Changelogs:', error);
            return [];
        }
    }

    /**
     * Lädt den Inhalt der CHANGELOG.md Datei
     */
    private async loadChangelogContent(): Promise<string | null> {
        // Da die CHANGELOG.md im Plugin-Verzeichnis liegt, nicht im Vault,
        // einbetten wir den Inhalt direkt hier
        return `# Changelog

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
     * Parst den Changelog-Inhalt und extrahiert relevante Versionen
     */
    private parseChangelog(content: string, fromVersion: string | undefined, toVersion: string): ChangelogEntry[] {
        const entries: ChangelogEntry[] = [];
        const lines = content.split('\n');
        
        let currentVersion = '';
        let currentChanges: ChangelogEntry['changes'] = {};
        let currentSection: 'features' | 'bugFixes' | 'improvements' | null = null;

        for (const line of lines) {
            // Version-Header erkennen (z.B. "## [0.2.1]" oder "## [0.1.6]")
            const versionMatch = line.match(/^##\s*\[?(\d+\.\d+\.\d+)\]?/);
            if (versionMatch) {
                // Vorherige Version speichern, falls vorhanden
                if (currentVersion && this.shouldIncludeVersion(currentVersion, fromVersion, toVersion)) {
                    entries.push({
                        version: currentVersion,
                        changes: { ...currentChanges }
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
            if (line.startsWith('### Improvements') || line.startsWith('### Performance')) {
                currentSection = 'improvements';
                currentChanges.improvements = [];
                continue;
            }

            // Changelog-Einträge sammeln
            if (currentSection && line.startsWith('- ')) {
                const changeText = line.substring(2).trim();
                if (changeText) {
                    currentChanges[currentSection]?.push(changeText);
                }
            }
        }

        // Letzte Version speichern
        if (currentVersion && this.shouldIncludeVersion(currentVersion, fromVersion, toVersion)) {
            entries.push({
                version: currentVersion,
                changes: { ...currentChanges }
            });
        }

        return entries;
    }

    /**
     * Bestimmt, ob eine Version in den Changelog-Einträgen enthalten sein soll
     */
    private shouldIncludeVersion(version: string, fromVersion: string | undefined, toVersion: string): boolean {
        // Immer die aktuelle Version einschließen
        if (version === toVersion) {
            return true;
        }

        // Wenn keine fromVersion (erstes Start), zeige die letzten wichtigen Versionen
        if (!fromVersion) {
            // Definiere wichtige Versionen, die beim ersten Start gezeigt werden sollen
            const importantVersionsToShow = ['0.3.0', '0.2.1', '0.2.0', '0.1.7', '0.1.6'];
            return importantVersionsToShow.includes(version);
        }

        // Version muss zwischen fromVersion (exklusiv) und toVersion (inklusiv) liegen
        return this.isNewerVersion(version, fromVersion) && 
               (version === toVersion || this.isNewerVersion(toVersion, version));
    }
}
