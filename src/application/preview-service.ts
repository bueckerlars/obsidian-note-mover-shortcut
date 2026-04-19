import type { MovePreview } from 'src/types/MovePreview';
import type NoteMoverShortcutPlugin from 'main';

export class PreviewService {
  constructor(private readonly plugin: NoteMoverShortcutPlugin) {}

  generateVaultMovePreview(): Promise<MovePreview> {
    return this.plugin.noteMover.generateVaultMovePreview();
  }

  generateActiveNotePreview(): Promise<MovePreview | null> {
    return this.plugin.noteMover.generateActiveNotePreview();
  }
}
