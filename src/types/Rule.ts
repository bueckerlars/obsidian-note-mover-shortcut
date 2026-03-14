/**
 * Rule V1 interface (legacy).
 * Use RuleV2 from './RuleV2' for new code. Rules V1 is no longer in active development.
 * @deprecated Legacy format. Prefer RuleV2. Kept for backward compatibility when Legacy Mode is enabled.
 */
export interface Rule {
  criteria: string; // Format: "type: value" (z.B. "tag: #project", "fileName: notes.md", "path: documents/")
  path: string;
}
