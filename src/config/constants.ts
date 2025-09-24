/**
 * Central configuration file for all constants and default values
 */

// =============================================================================
// HISTORY CONSTANTS
// =============================================================================

export const HISTORY_CONSTANTS = {
    MAX_HISTORY_ENTRIES: 50,
    MAX_BULK_OPERATIONS: 20,
    DUPLICATE_CHECK_WINDOW_MS: 1000, // 1 second window to detect duplicate entries
} as const;

// =============================================================================
// NOTIFICATION CONSTANTS
// =============================================================================

export const NOTIFICATION_CONSTANTS = {
    DEFAULT_DURATIONS: {
        info: 8000,
        error: 15000,
        update: 15000,
        success: 5000,
        warning: 10000,
    } as const,

    DEFAULT_TITLES: {
        info: "NoteMover info:",
        error: "NoteMover error:",
        update: "NoteMover update:",
        success: "NoteMover success:",
        warning: "NoteMover warning:",
    } as const,

    DURATION_OVERRIDE: 5000, // Used for specific notifications that need different duration
} as const;

// =============================================================================
// SETTINGS CONSTANTS
// =============================================================================

export const SETTINGS_CONSTANTS = {
    DEFAULT_SETTINGS: {
        destination: '/',
        inboxLocation: '',
        enablePeriodicMovement: false,
        periodicMovementInterval: 5,
        enableFilter: false,
        filter: [] as string[],
        isFilterWhitelist: false,
        enableRules: false,
        rules: [] as any[],
        onlyMoveNotesWithRules: false,
    },

    PLACEHOLDER_TEXTS: {
        FOLDER_PATH: 'Example: folder1/folder2',
        INTERVAL: '5',
        FILTER: 'Filter (z.B. tag:, fileName:, path:, property:, ...)',
        CRITERIA: 'Criteria (z.B. tag:, fileName:, path:, property:, ...)',
        PATH: 'Path',
    } as const,

    UI_TEXTS: {
        UNDO_ALL: "Undo All",
        UNDO: "Undo",
        CLEAR_HISTORY: "Clear history",
        CLEAR_HISTORY_TITLE: "Clear History",
        CLEAR_HISTORY_MESSAGE: "Are you sure you want to clear the history?<br/><br/>This action cannot be undone.",
        CLEAR_HISTORY_CONFIRM: "Clear History",
        CLEAR_HISTORY_CANCEL: "Cancel",
    } as const,
} as const;

// =============================================================================
// GENERAL CONSTANTS
// =============================================================================

export const GENERAL_CONSTANTS = {
    TIME_CONVERSIONS: {
        MINUTES_TO_MILLISECONDS: 60 * 1000,
    } as const,

    SUGGESTION_LIMITS: {
        FOLDER_SUGGESTIONS: 1000,
    } as const,
} as const;

