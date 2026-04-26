import type { MovePreview } from 'src/types/MovePreview';
import type AdvancedNoteMoverPlugin from 'main';

export class PreviewService {
  constructor(private readonly plugin: AdvancedNoteMoverPlugin) {}

  generateVaultMovePreview(): Promise<MovePreview> {
    return this.plugin.advancedNoteMover.generateVaultMovePreview();
  }

  generateActiveNotePreview(): Promise<MovePreview | null> {
    return this.plugin.advancedNoteMover.generateActiveNotePreview();
  }
}
