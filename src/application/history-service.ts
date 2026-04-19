import type {
  HistoryEntry,
  BulkOperation,
  TimeFilter,
} from 'src/types/HistoryEntry';
import type NoteMoverShortcutPlugin from 'main';

export class HistoryService {
  constructor(private readonly plugin: NoteMoverShortcutPlugin) {}

  getFilteredHistory(filter: TimeFilter): HistoryEntry[] {
    return this.plugin.historyManager.getFilteredHistory(filter);
  }

  getFilteredBulkOperations(filter: TimeFilter): BulkOperation[] {
    return this.plugin.historyManager.getFilteredBulkOperations(filter);
  }
}
