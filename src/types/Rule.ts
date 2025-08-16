export interface Rule {
    criteria: string; // Format: "type: value" (z.B. "tag: #project", "fileName: notes.md", "path: documents/")
    path: string;
}