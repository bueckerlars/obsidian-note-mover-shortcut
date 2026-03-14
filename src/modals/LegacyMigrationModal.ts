import { App, Setting } from 'obsidian';
import { BaseModal, BaseModalOptions } from './BaseModal';
import { MobileUtils } from '../utils/MobileUtils';

export interface LegacyMigrationModalOptions extends BaseModalOptions {
  onMigrate: () => Promise<void>;
  onDismiss: () => void;
  onDismissPermanently: () => Promise<void>;
}

/**
 * Modal prompting users with V1 (legacy) rules to migrate to Rules V2.
 * Offers: Migrate now, Ask me later, Don't ask again.
 */
export class LegacyMigrationModal extends BaseModal {
  private modalOptions: LegacyMigrationModalOptions;

  constructor(app: App, options: LegacyMigrationModalOptions) {
    super(app, {
      title: 'Migrate to Rules V2',
      cssClass: 'noteMover-legacy-migration-modal',
      size: 'small',
      ...options,
    });
    this.modalOptions = options;
  }

  protected createContent(): void {
    const { contentEl } = this;
    const isMobile = MobileUtils.isMobile();

    const messageEl = contentEl.createEl('div', {
      cls: isMobile
        ? 'noteMover-legacy-migration-message noteMover-legacy-migration-message-mobile'
        : 'noteMover-legacy-migration-message',
    });
    messageEl.createEl('p', {
      text: 'Rules V2 is now the default. You are currently using the legacy Rules V1 system.',
    });
    messageEl.createEl('p', {
      text: 'We recommend migrating to Rules V2 for more flexible rule matching with multiple conditions and logical operators. Your existing rules can be migrated automatically.',
    });

    if (isMobile) {
      this.createMobileButtons(contentEl);
    } else {
      this.createDesktopButtons(contentEl);
    }
  }

  private createMobileButtons(container: HTMLElement): void {
    // 1. Migrate to Rules V2 (primary)
    const migrateSetting = new Setting(container).addButton(btn => {
      btn
        .setButtonText('Migrate to Rules V2')
        .setCta()
        .onClick(async () => {
          await this.modalOptions.onMigrate();
          this.close();
        });
    });
    const migrateBtn = migrateSetting.settingEl.querySelector('button');
    if (migrateBtn) {
      migrateBtn.style.width = '100%';
      migrateBtn.style.minHeight = '48px';
    }

    // 2. Ask me later
    const laterSetting = new Setting(container).addButton(btn => {
      btn.setButtonText('Ask me later').onClick(() => {
        this.modalOptions.onDismiss();
        this.close();
      });
    });
    const laterBtn = laterSetting.settingEl.querySelector('button');
    if (laterBtn) {
      laterBtn.style.width = '100%';
      laterBtn.style.minHeight = '48px';
    }

    // 3. Don't ask again
    const dontAskSetting = new Setting(container).addButton(btn => {
      btn.setButtonText("Don't ask again").onClick(async () => {
        await this.modalOptions.onDismissPermanently();
        this.close();
      });
    });
    const dontAskBtn = dontAskSetting.settingEl.querySelector('button');
    if (dontAskBtn) {
      dontAskBtn.style.width = '100%';
      dontAskBtn.style.minHeight = '48px';
    }
  }

  private createDesktopButtons(container: HTMLElement): void {
    const buttonContainer = this.createButtonContainer(container);

    // Migrate (primary)
    this.createButton(
      buttonContainer,
      'Migrate to Rules V2',
      async () => {
        await this.modalOptions.onMigrate();
        this.close();
      },
      { isPrimary: true }
    );

    // Ask me later
    this.createButton(buttonContainer, 'Ask me later', () => {
      this.modalOptions.onDismiss();
      this.close();
    });

    // Don't ask again
    this.createButton(buttonContainer, "Don't ask again", async () => {
      await this.modalOptions.onDismissPermanently();
      this.close();
    });
  }
}
