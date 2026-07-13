import { BulkOperation, HistoryEntry, RetentionPolicy } from './HistoryEntry';
import { RuleV2 } from './RuleV2';
import type { ConflictResolutionSettings } from './ConflictResolution';
import type { ConflictSkipCacheData } from './ConflictSkipCache';

/**
 * @since 0.4.7
 */
export interface PluginData {
  settings: SettingsData;
  history: HistoryData;
  conflictSkipCache?: ConflictSkipCacheData;
  lastSeenVersion?: string;
  schemaVersion?: number;
}

export interface AttachmentMoveSettings {
  moveWithNote: boolean;
  skipSharedAttachments: boolean;
  /** Remove attachment source folders (e.g. _assets) when empty after a co-move. */
  deleteEmptyAssetFolders: boolean;
}

export interface SettingsData {
  triggers: TriggerSettings;
  filters: FilterSettings;
  retentionPolicy: RetentionPolicy;
  rulesV2?: RuleV2[];
  enableRuleEvaluationCache?: boolean;
  /** When false, vault markdown list / tag / property index cache is bypassed (always fresh scans). Default true. */
  enableVaultIndexCache?: boolean;
  /** When true, records timing spans and logs `[Advanced Note Mover perf]` to the console. */
  enablePerformanceDebug?: boolean;
  /** When true (default), show the changelog modal once after a plugin version update. */
  showReleaseNotesOnUpdate?: boolean;
  /**
   * When true (default), destination folders are created automatically if they
   * do not exist. When false, notes are skipped (not moved) if the destination
   * folder is missing. Individual rules can override this via
   * {@link RuleV2.createDestinationFolder}.
   */
  createMissingDestinationFolders?: boolean;
  attachments?: AttachmentMoveSettings;
  conflictResolution?: ConflictResolutionSettings;
}

export interface HistoryData {
  history: HistoryEntry[];
  bulkOperations: BulkOperation[];
}

export interface TriggerSettings {
  enablePeriodicMovement: boolean;
  periodicMovementInterval: number;
  enableOnEditTrigger: boolean;
}

export interface FilterSettings {
  filter: Filter[];
}

export interface Filter {
  value: string;
}
