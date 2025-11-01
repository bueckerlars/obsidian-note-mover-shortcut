import { BulkOperation, HistoryEntry, RetentionPolicy } from './HistoryEntry';
import { Rule } from './Rule';
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
  rules: Rule[];
  retentionPolicy: RetentionPolicy;
  enableRuleV2?: boolean;
  rulesV2?: RuleV2[];
  enableTemplateRules?: boolean;
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
