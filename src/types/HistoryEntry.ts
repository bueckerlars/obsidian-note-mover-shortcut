export interface HistoryEntry {
    id: string;
    sourcePath: string;
    destinationPath: string;
    timestamp: number;
    fileName: string;
    bulkOperationId?: string; // Groups entries that belong to the same bulk operation
    operationType?: 'single' | 'bulk' | 'periodic'; // Type of operation
}

export interface BulkOperation {
    id: string;
    operationType: 'bulk' | 'periodic';
    timestamp: number;
    entries: HistoryEntry[];
    totalFiles: number;
}

// Time filter options for history modal
export type TimeFilter = 'all' | 'today' | 'week' | 'month';

// Retention policy settings
export interface RetentionPolicy {
    value: number;
    unit: 'days' | 'weeks' | 'months';
} 