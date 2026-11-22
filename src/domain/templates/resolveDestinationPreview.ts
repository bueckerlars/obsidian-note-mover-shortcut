import type { FileMetadata } from '../../types/Common';
import { normalizeDestinationFolderPath } from '../../utils/PathUtils';
import { renderDestinationTemplate } from './DestinationTemplate';

type TemplateSource = Pick<
  FileMetadata,
  'tags' | 'properties' | 'createdAt' | 'updatedAt'
>;

/** Folder a note would move to, or null when the destination does not resolve. */
export function resolveDestinationPreview(
  destination: string,
  note: TemplateSource
): string | null {
  if (!destination.trim()) return null;
  try {
    const rendered = renderDestinationTemplate(destination, {
      tags: note.tags,
      properties: note.properties,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
    const normalized = normalizeDestinationFolderPath(rendered);
    return normalized.ok ? normalized.path : null;
  } catch {
    return null;
  }
}
