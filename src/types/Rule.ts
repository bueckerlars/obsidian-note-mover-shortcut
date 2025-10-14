/**
 * Rule V1 interface
 * @deprecated Use RuleV2 from './RuleV2' instead. This will be removed in a future version.
 */
export interface Rule {
  criteria: string; // Format: "type: value" (z.B. "tag: #project", "fileName: notes.md", "path: documents/")
  path: string;
}
