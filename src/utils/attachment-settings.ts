import type { SettingsData, AttachmentMoveSettings } from '../types/PluginData';

const DEFAULT_ATTACHMENT_SETTINGS: AttachmentMoveSettings = {
  moveWithNote: true,
  skipSharedAttachments: true,
  deleteEmptyAssetFolders: false,
};

/** Resolves attachment co-move settings with defaults. */
export function getAttachmentMoveSettings(
  settings: SettingsData
): AttachmentMoveSettings {
  const attachments = settings.attachments;
  return {
    moveWithNote:
      attachments?.moveWithNote ?? DEFAULT_ATTACHMENT_SETTINGS.moveWithNote,
    skipSharedAttachments:
      attachments?.skipSharedAttachments ??
      DEFAULT_ATTACHMENT_SETTINGS.skipSharedAttachments,
    deleteEmptyAssetFolders:
      attachments?.deleteEmptyAssetFolders ??
      DEFAULT_ATTACHMENT_SETTINGS.deleteEmptyAssetFolders,
  };
}
