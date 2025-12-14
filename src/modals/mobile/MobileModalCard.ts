/**
 * Base mobile modal card component with consistent card-based layout
 * Similar to MobileSettingItem but optimized for modal usage
 */
export class MobileModalCard {
  private cardEl: HTMLElement;
  private headerEl: HTMLElement;
  private titleEl: HTMLElement;
  private descriptionEl: HTMLElement | null = null;
  private contentEl: HTMLElement;

  constructor(container: HTMLElement, title: string, description?: string) {
    // Create card container
    this.cardEl = container.createDiv({ cls: 'noteMover-mobile-modal-card' });

    // Create header
    this.headerEl = this.cardEl.createDiv({
      cls: 'noteMover-mobile-modal-card-header',
    });
    this.titleEl = this.headerEl.createDiv({
      cls: 'noteMover-mobile-modal-card-title',
    });
    this.titleEl.textContent = title;

    // Create description if provided
    if (description) {
      this.descriptionEl = this.cardEl.createDiv({
        cls: 'noteMover-mobile-modal-card-description',
      });
      this.descriptionEl.textContent = description;
    }

    // Create content container
    this.contentEl = this.cardEl.createDiv({
      cls: 'noteMover-mobile-modal-card-content',
    });
  }

  getCardElement(): HTMLElement {
    return this.cardEl;
  }

  getContentElement(): HTMLElement {
    return this.contentEl;
  }

  getHeaderElement(): HTMLElement {
    return this.headerEl;
  }

  setDescription(text: string): void {
    if (this.descriptionEl) {
      this.descriptionEl.textContent = text;
    } else {
      this.descriptionEl = this.cardEl.createDiv({
        cls: 'noteMover-mobile-modal-card-description',
      });
      this.descriptionEl.textContent = text;
    }
  }

  addClass(cls: string): void {
    this.cardEl.addClass(cls);
  }
}
