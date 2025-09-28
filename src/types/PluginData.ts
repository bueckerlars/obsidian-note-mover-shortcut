import { BulkOperation, HistoryEntry, RetentionPolicy } from './HistoryEntry';
import { Rule } from './Rule';

export interface PluginData {
  settings: SettingsData;
  history: HistoryData;
  lastSeenVersion?: string;
}

export interface SettingsData {
  triggers: TriggerSettings;
  filters: FilterSettings;
  rules: Rule[];
  retentionPolicy: RetentionPolicy;
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
