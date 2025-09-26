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
  DEFAULT_RETENTION_POLICY: {
    value: 30,
    unit: 'days' as const,
  },
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
    info: 'NoteMover info:',
    error: 'NoteMover error:',
    update: 'NoteMover update:',
    success: 'NoteMover success:',
    warning: 'NoteMover warning:',
  } as const,

  DURATION_OVERRIDE: 5000, // Used for specific notifications that need different duration
} as const;

// =============================================================================
// SETTINGS CONSTANTS
// =============================================================================

export const SETTINGS_CONSTANTS = {
  DEFAULT_SETTINGS: {
    enablePeriodicMovement: false,
    periodicMovementInterval: 5,
    enableOnEditTrigger: false,
    filter: [] as string[],
    isFilterWhitelist: false,
    rules: [] as any[],
    onlyMoveNotesWithRules: false,
    retentionPolicy: HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY,
  },

  PLACEHOLDER_TEXTS: {
    FOLDER_PATH: 'Example: folder1/folder2',
    INTERVAL: '5',
    FILTER: 'Filter (z.B. tag:, fileName:, path:, property:, ...)',
    CRITERIA: 'Criteria (z.B. tag:, fileName:, path:, property:, ...)',
    PATH: 'Path',
  } as const,

  UI_TEXTS: {
    UNDO_ALL: 'Undo All',
    UNDO: 'Undo',
    CLEAR_HISTORY: 'Clear history',
    CLEAR_HISTORY_TITLE: 'Clear History',
    CLEAR_HISTORY_MESSAGE:
      'Are you sure you want to clear the history?<br/><br/>This action cannot be undone.',
    CLEAR_HISTORY_CONFIRM: 'Clear History',
    CLEAR_HISTORY_CANCEL: 'Cancel',
    EXPORT_SETTINGS: 'Export Settings',
    IMPORT_SETTINGS: 'Import Settings',
    EXPORT_SETTINGS_TITLE: 'Export Settings',
    EXPORT_SETTINGS_MESSAGE:
      'This will download your current settings as a JSON file.',
    EXPORT_SETTINGS_CONFIRM: 'Export',
    EXPORT_SETTINGS_CANCEL: 'Cancel',
    IMPORT_SETTINGS_TITLE: 'Import Settings',
    IMPORT_SETTINGS_MESSAGE:
      'This will replace your current settings with the imported ones.<br/><br/>This action cannot be undone. Make sure you have a backup of your current settings.',
    IMPORT_SETTINGS_CONFIRM: 'Import',
    IMPORT_SETTINGS_CANCEL: 'Cancel',
    IMPORT_SUCCESS: 'Settings imported successfully',
    IMPORT_ERROR: 'Failed to import settings',
    EXPORT_SUCCESS: 'Settings exported successfully',
    EXPORT_ERROR: 'Failed to export settings',
    INVALID_FILE: 'Invalid file format. Please select a valid JSON file.',
    VALIDATION_ERRORS: 'Settings validation failed',
    // History time filter texts
    TIME_FILTER_ALL: 'All',
    TIME_FILTER_TODAY: 'Today',
    TIME_FILTER_WEEK: 'This Week',
    TIME_FILTER_MONTH: 'This Month',
    TIME_FILTER_LABEL: 'Show entries from:',
    // Retention policy texts
    RETENTION_POLICY_TITLE: 'Retention Policy',
    RETENTION_POLICY_DESC: 'Configure how long history entries should be kept',
    RETENTION_POLICY_VALUE_LABEL: 'Keep entries for:',
    RETENTION_POLICY_UNIT_LABEL: 'Unit:',
    RETENTION_POLICY_DAYS: 'Days',
    RETENTION_POLICY_WEEKS: 'Weeks',
    RETENTION_POLICY_MONTHS: 'Months',
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
