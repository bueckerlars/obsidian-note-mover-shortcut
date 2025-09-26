import { TFile } from 'obsidian';
import NoteMoverShortcutPlugin from 'main';
import { UpdateModal } from '../modals/UpdateModal';
import { NoticeManager } from '../utils/NoticeManager';
import { RuleMatcher } from './RuleMatcher';
import { FileMovementService } from './FileMovementService';
import { BaseModal } from 'src/modals/BaseModal';
import { MetadataExtractor } from './MetadataExtractor';
import { ChangelogEntry, CHANGELOG_ENTRIES } from '../generated/changelog';

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
      return this.filterChangelogEntries(
        CHANGELOG_ENTRIES,
        fromVersion,
        toVersion
      );
    } catch (error) {
      NoticeManager.error(
        `Fehler beim Laden des Changelogs: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Filters changelog entries based on version range
   * @param entries All available changelog entries
   * @param fromVersion The start version (exclusive)
   * @param toVersion The end version (inclusive)
   * @returns Filtered array of changelog entries
   */
  private filterChangelogEntries(
    entries: ChangelogEntry[],
    fromVersion: string | undefined,
    toVersion: string
  ): ChangelogEntry[] {
    return entries.filter(entry =>
      this.shouldIncludeVersion(entry.version, fromVersion, toVersion)
    );
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
