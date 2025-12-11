import { Notice } from 'obsidian';
import { NOTIFICATION_CONSTANTS } from '../config/constants';
import { type NotificationType } from '../types/Common';

export interface NoticeOptions {
  duration?: number;
  showUndoButton?: boolean;
  onUndo?: () => void;
  undoText?: string;
}

export class NoticeManager {
  /**
   * Shows a notice with the specified type and message
   * @param type - The type of notice to show
   * @param message - The message to display
   * @param options - Additional options for the notice
   */
  public static show(
    type: NotificationType,
    message: string,
    options: NoticeOptions = {}
  ): Notice {
    const duration =
      options.duration ?? NOTIFICATION_CONSTANTS.DEFAULT_DURATIONS[type];
    const notice = new Notice('', duration);
    const noticeEl = notice.noticeEl;

    // Add title
    const title = document.createElement('b');
    title.textContent = NOTIFICATION_CONSTANTS.DEFAULT_TITLES[type];
    noticeEl.appendChild(title);
    noticeEl.appendChild(document.createElement('br'));

    // Add message
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    noticeEl.appendChild(messageEl);

    // Add undo button if requested
    if (options.showUndoButton && options.onUndo) {
      const undoButton = document.createElement('button');
      undoButton.textContent = options.undoText ?? 'Undo';
      undoButton.className = 'mod-warning noteMover-notice-undo-button';
      undoButton.onclick = () => {
        try {
          options.onUndo!();
          notice.hide();
        } catch (error) {
          console.error('Error in undo button click handler:', error);
          this.show(
            'error',
            `Error undoing action: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      };
      noticeEl.appendChild(undoButton);
    }

    return notice;
  }

  /**
   * Shows an info notice
   * @param message - The message to display
   * @param options - Additional options
   */
  public static info(message: string, options?: NoticeOptions): Notice {
    return this.show('info', message, options);
  }

  /**
   * Shows an error notice
   * @param message - The message to display
   * @param options - Additional options
   */
  public static error(message: string, options?: NoticeOptions): Notice {
    return this.show('error', message, options);
  }

  /**
   * Shows an update notice
   * @param message - The message to display
   * @param options - Additional options
   */
  public static update(message: string, options?: NoticeOptions): Notice {
    return this.show('update', message, options);
  }

  /**
   * Shows a success notice
   * @param message - The message to display
   * @param options - Additional options
   */
  public static success(message: string, options?: NoticeOptions): Notice {
    return this.show('success', message, options);
  }

  /**
   * Shows a warning notice
   * @param message - The message to display
   * @param options - Additional options
   */
  public static warning(message: string, options?: NoticeOptions): Notice {
    return this.show('warning', message, options);
  }

  /**
   * Shows a notice with undo functionality
   * @param type - The type of notice
   * @param message - The message to display
   * @param onUndo - The function to call when undo is clicked
   * @param undoText - The text for the undo button
   * @param options - Additional options
   */
  public static showWithUndo(
    type: NotificationType,
    message: string,
    onUndo: () => void,
    undoText?: string,
    options?: NoticeOptions
  ): Notice {
    return this.show(type, message, {
      ...options,
      showUndoButton: true,
      onUndo,
      undoText,
    });
  }
}
