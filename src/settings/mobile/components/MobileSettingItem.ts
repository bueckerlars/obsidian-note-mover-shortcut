/**
 * Base mobile setting item component with compact card-based layout
 */
export class MobileSettingItem {
  private cardEl: HTMLElement;
  private headerEl: HTMLElement;
  private titleEl: HTMLElement;
  private descriptionEl: HTMLElement | null = null;
  private controlEl: HTMLElement;

  constructor(container: HTMLElement, title: string, description?: string) {
    // Create card container
    this.cardEl = container.createDiv({ cls: 'mobile-setting-card' });

    // Create header
    this.headerEl = this.cardEl.createDiv({ cls: 'mobile-setting-header' });
    this.titleEl = this.headerEl.createDiv({ cls: 'mobile-setting-title' });
    this.titleEl.textContent = title;

    // Create description if provided
    if (description) {
      this.descriptionEl = this.cardEl.createDiv({
        cls: 'mobile-setting-description',
      });
      this.descriptionEl.textContent = description;
    }

    // Create control container
    this.controlEl = this.cardEl.createDiv({ cls: 'mobile-setting-control' });
  }

  getCardElement(): HTMLElement {
    return this.cardEl;
  }

  getControlElement(): HTMLElement {
    return this.controlEl;
  }

  setDescription(text: string): void {
    if (this.descriptionEl) {
      this.descriptionEl.textContent = text;
    } else {
      this.descriptionEl = this.cardEl.createDiv({
        cls: 'mobile-setting-description',
      });
      this.descriptionEl.textContent = text;
    }
  }

  addClass(cls: string): void {
    this.cardEl.addClass(cls);
  }
}
