import { BulkOperation, HistoryEntry, RetentionPolicy } from './HistoryEntry';
import { Rule } from './Rule';

/**
 * @since 0.4.7
 */
export interface PluginData {
  settings: SettingsData;
  history: HistoryData;
  lastSeenVersion?: string;
  /**
   * Optional persistent index/cache used to speed up bulk/periodic operations.
   * Present when the Index feature is enabled and initialized.
   */
  index?: IndexData;
}

export interface SettingsData {
  triggers: TriggerSettings;
  filters: FilterSettings;
  rules: Rule[];
  retentionPolicy: RetentionPolicy;
  /** Indexing & performance related settings */
  indexing?: IndexingSettings;
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

export interface IndexingSettings {
  enableIndexCache: boolean;
  detectionMode: 'mtimeSize' | 'hash';
  maxExcerptBytes: number; // 0 disables content excerpts
}

/**
 * Persistent file index stored in data.json under PluginData.index
 * @since 0.4.7
 */
export interface IndexData {
  schemaVersion: number;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  stats: IndexStats;
  entries: { [canonicalPath: string]: IndexEntry };
}

/**
 * @since 0.4.7
 */
export interface IndexStats {
  numFiles: number;
  numDirty: number;
  lastFullScanAt?: string; // ISO timestamp
}

/**
 * @since 0.4.7
 */
export interface IndexEntry {
  path: string; // canonical path (vault-relative)
  basename: string;
  ext?: string;
  parent: string; // parent directory
  ctime?: number;
  mtime?: number;
  size?: number;
  signature: {
    mtime?: number;
    size?: number;
    contentHash?: string;
    mode: 'mtimeSize' | 'hash';
  };
  meta?: {
    frontmatter?: Record<string, unknown>;
    tags?: string[];
    aliases?: string[];
  };
  content?: {
    excerpt?: string;
    headings?: string[];
    links?: string[];
    tokens?: string[];
    excerptBytes?: number;
  };
  isDeleted?: boolean;
  dirty?: boolean;
  lastIndexedAt?: string; // ISO timestamp
}
