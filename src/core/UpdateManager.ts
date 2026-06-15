import AdvancedNoteMoverPlugin from 'main';
import { UpdateModal } from '../modals/UpdateModal';
import { NoticeManager } from '../utils/NoticeManager';
import { ChangelogEntry, CHANGELOG_ENTRIES } from '../generated/changelog';
import {
  persistLastSeenVersionAppLevel,
  resolveLastSeenVersion,
} from '../infrastructure/persistence/app-level-release-notes-store';
import {
  isNewerVersion,
  shouldOfferReleaseNotes,
} from '../utils/version-compare';

export class UpdateManager {
  private plugin: AdvancedNoteMoverPlugin;

  constructor(plugin: AdvancedNoteMoverPlugin) {
    this.plugin = plugin;
  }

  /**
   * Checks if the plugin has been updated and shows the UpdateModal when appropriate.
   */
  async checkForUpdates(): Promise<void> {
    const currentVersion = this.plugin.manifest.version;
    const lastSeenVersion = this.getLastSeenVersion();

    if (shouldOfferReleaseNotes(lastSeenVersion, currentVersion)) {
      if (this.isReleaseNotesEnabled()) {
        await this.showUpdateModal();
      } else {
        await this.markVersionSeen(currentVersion);
      }
      return;
    }

    if (!lastSeenVersion?.trim()) {
      await this.markVersionSeen(currentVersion);
    }
  }

  /**
   * Shows the UpdateModal (can also be called manually)
   * @param forceShow If true, the modal will be shown even if the version has already been seen
   */
  async showUpdateModal(forceShow = false): Promise<void> {
    const currentVersion = this.plugin.manifest.version;
    let lastSeenVersion = this.getLastSeenVersion();

    // For manual invocation (forceShow), use an older version as base,
    // to ensure relevant information is displayed
    if (forceShow && lastSeenVersion === currentVersion) {
      // Use an older version as base for display
      lastSeenVersion = '0.4.7';
    }

    const changelogEntries = await this.getRelevantChangelogEntries(
      lastSeenVersion,
      currentVersion
    );

    // Persist before opening so vault switches / force-stop cannot lose the mark.
    if (!forceShow) {
      await this.markVersionSeen(currentVersion);
    }

    const updateModal = new UpdateModal(
      this.plugin.app,
      currentVersion,
      lastSeenVersion || '',
      changelogEntries
    );
    updateModal.open();
  }

  private isReleaseNotesEnabled(): boolean {
    return this.plugin.pluginData.settings.showReleaseNotesOnUpdate !== false;
  }

  private getLastSeenVersion(): string | undefined {
    return resolveLastSeenVersion(this.plugin.pluginData.lastSeenVersion);
  }

  private async markVersionSeen(version: string): Promise<void> {
    persistLastSeenVersionAppLevel(version);
    this.plugin.pluginData.lastSeenVersion = version;
    await this.plugin.save_settings();
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
        `Error loading changelog: ${error instanceof Error ? error.message : String(error)}`
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
        '0.5.0',
        '0.4.6',
        '0.4.5',
        '0.4.4',
        '0.4.3',
        '0.4.2',
        '0.4.1',
        '0.4.0',
        '0.3.5',
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
      isNewerVersion(version, fromVersion) &&
      (version === toVersion || isNewerVersion(toVersion, version))
    );
  }
}
