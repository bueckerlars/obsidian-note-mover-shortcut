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
     */
    async showUpdateModal(): Promise<void> {
        const currentVersion = this.plugin.manifest.version;
        const lastSeenVersion = this.plugin.settings.lastSeenVersion;
        const changelogEntries = await this.getRelevantChangelogEntries(lastSeenVersion, currentVersion);
        
        // UpdateModal anzeigen
        const updateModal = new UpdateModal(
            this.plugin.app,
            currentVersion,
            lastSeenVersion || '',
            changelogEntries
        );
        updateModal.open();

        // Aktuelle Version als "gesehen" markieren
        this.plugin.settings.lastSeenVersion = currentVersion;
        await this.plugin.save_settings();
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
        const changelogFile = this.plugin.app.vault.getAbstractFileByPath('CHANGELOG.md');
        
        if (changelogFile instanceof TFile) {
            return await this.plugin.app.vault.read(changelogFile);
        }

        return null;
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
            const importantVersionsToShow = ['0.2.0', '0.1.7', '0.1.6', '0.1.5'];
            return importantVersionsToShow.includes(version);
        }

        // Version muss zwischen fromVersion (exklusiv) und toVersion (inklusiv) liegen
        return this.isNewerVersion(version, fromVersion) && 
               (version === toVersion || this.isNewerVersion(toVersion, version));
    }
}
