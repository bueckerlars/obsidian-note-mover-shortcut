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