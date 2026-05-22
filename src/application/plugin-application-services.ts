import type AdvancedNoteMoverPlugin from 'main';
import { MoveFileService } from './move-file-service';
import { PreviewService } from './preview-service';
import { HistoryService } from './history-service';

export type PluginApplicationServices = {
  moveFile: MoveFileService;
  preview: PreviewService;
  history: HistoryService;
};

export function createPluginApplicationServices(
  plugin: AdvancedNoteMoverPlugin
): PluginApplicationServices {
  return {
    moveFile: new MoveFileService(plugin),
    preview: new PreviewService(plugin),
    history: new HistoryService(plugin),
  };
}
