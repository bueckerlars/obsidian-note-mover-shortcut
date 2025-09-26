import { Plugin, TFile } from 'obsidian';
import { NoteMoverShortcut } from 'src/core/NoteMoverShortcut';
import { CommandHandler } from 'src/handlers/CommandHandler';
import {
  DEFAULT_SETTINGS,
  NoteMoverShortcutSettings,
  NoteMoverShortcutSettingsTab,
} from 'src/settings/Settings';
import { HistoryManager } from 'src/core/HistoryManager';
import { TriggerEventHandler } from 'src/core/TriggerEventHandler';
import { UpdateManager } from 'src/core/UpdateManager';

export default class NoteMoverShortcutPlugin extends Plugin {
  public settings: NoteMoverShortcutSettings;
  public noteMover: NoteMoverShortcut;
  public command_handler: CommandHandler;
  public historyManager: HistoryManager;
  public updateManager: UpdateManager;
  public triggerHandler: TriggerEventHandler;

  async onload() {
    await this.load_settings();

    this.historyManager = new HistoryManager(this);
    this.historyManager.loadHistoryFromSettings();
    this.updateManager = new UpdateManager(this);
    this.noteMover = new NoteMoverShortcut(this);
    this.triggerHandler = new TriggerEventHandler(this);
    this.command_handler = new CommandHandler(this);
    this.command_handler.setup();

    this.addRibbonIcon('book-plus', 'NoteMover', (evt: MouseEvent) => {
      this.noteMover.moveFocusedNoteToDestination();
    });

    this.addSettingTab(new NoteMoverShortcutSettingsTab(this));

    // Initialize triggers
    this.triggerHandler.togglePeriodic();
    this.triggerHandler.toggleOnEditListener();

    // Event listener for automatic history creation during manual file operations
    this.setupVaultEventListeners();

    // Check for updates after complete loading
    this.app.workspace.onLayoutReady(() => {
      this.updateManager.checkForUpdates();
    });
  }

  onunload() {
    // Event listeners are automatically removed when the plugin is unloaded
  }

  /**
   * Setup of event listeners for automatic history creation
   */
  private setupVaultEventListeners(): void {
    // Monitor file renaming/moving
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        // Only for Markdown files
        if (file instanceof TFile && file.extension === 'md') {
          this.historyManager.addEntryFromVaultEvent(
            oldPath,
            file.path,
            file.name
          );
        }
      })
    );
  }

  async save_settings(): Promise<void> {
    (this.settings as any).history = this.historyManager
      ? this.historyManager.getHistory()
      : [];
    await this.saveData(this.settings);
  }

  async load_settings(): Promise<void> {
    const savedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData || {});
  }
}
