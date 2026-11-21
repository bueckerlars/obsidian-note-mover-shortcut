import { Platform } from 'obsidian';

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
   * Check if the app is running on a phone device
   * @returns true if mobile but not tablet
   */
  static isPhone(): boolean {
    return Platform.isPhone;
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
}
