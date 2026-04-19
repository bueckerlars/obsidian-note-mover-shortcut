/**
 * Minimal stub so Vitest can load modules that import `obsidian`.
 * Not used at runtime in Obsidian.
 */
export class TAbstractFile {}
export class TFile extends TAbstractFile {
  extension = 'md';
  path = '';
  name = '';
}

export function getAllTags(_cache: Record<string, unknown>): string[] {
  return [];
}
