import { Platform, setIcon } from 'obsidian';

/**
 * Utility class for mobile platform detection and mobile-specific functionality
 */
export class MobileUtils {
  /**
   * Check if the app is running on a mobile device
   * @returns true if running on iOS, Android, or mobile web
   */
  static isMobile(): boolean {
    return Platform.isMobile || Platform.isIosApp || Platform.isAndroidApp;
  }

  /**
   * Check if the app is running on a tablet device
   * @returns true if mobile and screen width >= 600px
   */
  static isTablet(): boolean {
    return this.isMobile() && window.innerWidth >= 600;
  }

  /**
   * Check if the app is running on a phone device
   * @returns true if mobile but not tablet
   */
  static isPhone(): boolean {
    return this.isMobile() && !this.isTablet();
  }

  /**
   * Add mobile-specific CSS classes to an element
   * @param element - The HTML element to add classes to
   */
  static addMobileClass(element: HTMLElement): void {
    if (this.isMobile()) {
      element.addClass('is-mobile');
      if (this.isPhone()) {
        element.addClass('is-phone');
      } else {
        element.addClass('is-tablet');
      }
    } else {
      element.addClass('is-desktop');
    }
  }

  /**
   * Get mobile-specific CSS class string
   * @returns CSS class string based on platform
   */
  static getMobileClass(): string {
    if (this.isMobile()) {
      if (this.isPhone()) {
        return 'is-mobile is-phone';
      } else {
        return 'is-mobile is-tablet';
      }
    }
    return 'is-desktop';
  }

  /**
   * Create a move button (up/down) for mobile UI
   * @param container - Container element to append button to
   * @param direction - 'up' or 'down'
   * @param onClick - Click handler
   * @param disabled - Whether button should be disabled (if true, button won't be created)
   * @returns Created button element or null if disabled
   */
  static createMoveButton(
    container: HTMLElement,
    direction: 'up' | 'down',
    onClick: () => void | Promise<void>,
    disabled = false
  ): HTMLButtonElement | null {
    if (disabled) {
      return null;
    }

    const button = container.createEl('button', {
      cls: `noteMover-mobile-move-button noteMover-mobile-move-${direction}-button`,
    });

    const iconName = direction === 'up' ? 'chevron-up' : 'chevron-down';
    setIcon(button, iconName);

    button.addEventListener('click', async () => {
      await onClick();
    });

    return button;
  }

  /**
   * Create an action button for mobile UI
   * @param container - Container element to append button to
   * @param text - Button text
   * @param onClick - Click handler
   * @param options - Button options (isPrimary, isDanger)
   * @returns Created button element
   */
  static createActionButton(
    container: HTMLElement,
    text: string,
    onClick: () => void | Promise<void>,
    options: { isPrimary?: boolean; isDanger?: boolean } = {}
  ): HTMLButtonElement {
    const button = container.createEl('button', {
      cls: 'noteMover-mobile-action-btn',
      text: text,
    });

    if (options.isPrimary) {
      button.addClass('mod-cta');
      button.style.background = 'var(--interactive-accent)';
      button.style.color = 'var(--text-on-accent)';
    } else if (options.isDanger) {
      button.addClass('noteMover-mobile-delete-btn');
    }

    button.addEventListener('click', async () => {
      await onClick();
    });

    return button;
  }
}
