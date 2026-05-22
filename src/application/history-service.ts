import type {
  HistoryEntry,
  BulkOperation,
  TimeFilter,
} from 'src/types/HistoryEntry';
import type AdvancedNoteMoverPlugin from 'main';

export class HistoryService {
  constructor(private readonly plugin: AdvancedNoteMoverPlugin) {}

  getFilteredHistory(filter: TimeFilter): HistoryEntry[] {
    return this.plugin.historyManager.getFilteredHistory(filter);
  }

  getFilteredBulkOperations(filter: TimeFilter): BulkOperation[] {
    return this.plugin.historyManager.getFilteredBulkOperations(filter);
  }
}
