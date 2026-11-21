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
    rules: [] as never[],
    retentionPolicy: HISTORY_CONSTANTS.DEFAULT_RETENTION_POLICY,
    createMissingDestinationFolders: true,
  },
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
