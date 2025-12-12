/**
 * Mobile-optimized section component for modals
 * Provides consistent spacing and styling for modal sections
 */
export class MobileModalSection {
  private sectionEl: HTMLElement;
  private titleEl: HTMLElement | null = null;

  constructor(container: HTMLElement, title?: string) {
    this.sectionEl = container.createDiv({
      cls: 'noteMover-mobile-modal-section',
    });

    if (title) {
      this.titleEl = this.sectionEl.createEl('h3', {
        cls: 'noteMover-mobile-modal-section-title',
        text: title,
      });
    }
  }

  getSectionElement(): HTMLElement {
    return this.sectionEl;
  }

  addClass(cls: string): void {
    this.sectionEl.addClass(cls);
  }
}
