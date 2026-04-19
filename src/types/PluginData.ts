import { BulkOperation, HistoryEntry, RetentionPolicy } from './HistoryEntry';
import { RuleV2 } from './RuleV2';

/**
 * @since 0.4.7
 */
export interface PluginData {
  settings: SettingsData;
  history: HistoryData;
  lastSeenVersion?: string;
  schemaVersion?: number;
}

export interface SettingsData {
  triggers: TriggerSettings;
  filters: FilterSettings;
  retentionPolicy: RetentionPolicy;
  rulesV2?: RuleV2[];
  enableRuleEvaluationCache?: boolean;
  /** When false, vault markdown list / tag / property index cache is bypassed (always fresh scans). Default true. */
  enableVaultIndexCache?: boolean;
  /** When true, records timing spans and logs `[NoteMover perf]` to the console. */
  enablePerformanceDebug?: boolean;
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
