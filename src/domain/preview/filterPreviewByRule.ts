import type { MovePreview } from '../../types/MovePreview';

/** Keeps only the notes the named rule matched. */
export function filterPreviewByRule(
  preview: MovePreview,
  ruleName: string
): MovePreview {
  const keep = <T extends { matchedRule?: string }>(entries: T[]): T[] =>
    entries.filter(entry => entry.matchedRule === ruleName);
  const analyzed = keep(preview.analyzed);
  return {
    ...preview,
    successfulMoves: keep(preview.successfulMoves),
    analyzed,
    totalFiles: analyzed.length,
  };
}
