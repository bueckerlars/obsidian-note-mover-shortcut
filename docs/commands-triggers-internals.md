# Commands, triggers, and internals

## Palette commands

Registered in `src/handlers/CommandHandler.ts`:

| Command ID                      | Name                                | Action                                                                                                                  |
| ------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `trigger-note-movement`         | Move active note to note folder     | Moves the **active** movable file (`.md`, `.canvas`, `.base`) using rules + filters; shows a notice with optional undo. |
| `trigger-note-bulk-move`        | Move all files in vault             | Scans movable files (via vault index cache) and attempts moves per file.                                                |
| `show-history`                  | Show history                        | Opens the history modal (undo, retention UI in settings).                                                               |
| `preview-bulk-movement`         | Preview bulk movement for all files | Opens preview modal for **all** movable files (rules on, filters on).                                                   |
| `preview-note-movement`         | Preview active note movement        | Preview for the active movable file only.                                                                               |
| `add-current-file-to-blacklist` | Add current file to blacklist       | Appends `fileName: <name>` to the filter list if not already present.                                                   |

The ribbon icon **book-plus** calls the same path as **Move active note**.

Active-file commands use `checkCallback` so they appear when a note, canvas, or base file is focused (not only in the Markdown editor).

## Triggers (automation)

Configured under **Triggers** in settings (`TriggerSettings` in `src/types/PluginData.ts`):

| Setting                  | Behavior                                                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enableOnEditTrigger`    | Registers `vault.on('modify')` for movable files (`.md`, `.canvas`, `.base`); after **2s debounce**, runs the same single-file move pipeline for the changed file. Also marks the rule cache dirty. |
| `enablePeriodicMovement` | `setInterval` every `periodicMovementInterval` **minutes** to run a **full-vault** move pass (same per-file move as bulk).                                                                          |

## Movable file types

Bulk, periodic, preview, and on-edit scans include:

- **Markdown** (`.md`)
- **Canvas** (`.canvas`, JSON Canvas format)
- **Bases** (`.base`)

Other vault files (images, PDFs, etc.) are **not** moved by bulk/periodic passes.

For canvas and base files, rule criteria based on tags, properties, links, or headings usually do not apply (Obsidian’s metadata cache is markdown-oriented). Use `fileName`, `folder`, or `extension` rules for those file types.

## Move pipeline (single file)

`AdvancedNoteMover.moveFileBasedOnTags` (`src/core/AdvancedNoteMover.ts`):

1. Optional **rule evaluation cache** short-circuit (see below).
2. `RuleManagerV2.moveFileBasedOnTags` → metadata + blacklist + first matching rule + destination resolution.
3. If result is `null`, **no move**.
4. If target path equals current path, **no move**.
5. `ensureFolderExists` for the target folder, then `performNoteMove` (`src/application/perform-note-move.ts`).
6. **Optional attachment co-move** (when `settings.attachments.moveWithNote` is enabled): before the note rename, referenced attachments under the note folder are collected from the metadata cache; after the note rename, each attachment is moved to the same relative path beside the new note location (e.g. `Folder A/_assets/x.png` → `Folder B/_assets/x.png`). Shared attachments can be skipped via `skipSharedAttachments`.
7. History entry recorded (including `attachmentMoves` when applicable); notices/undo restore the note and co-moved attachments.

## Rule evaluation cache

When `enableRuleEvaluationCache` is **not** `false` (default: cache on), `RuleEvaluationCache` stores the last **matched destination folder** per path + mtime + rules/filters hash.

- **Dirty** paths (modify/create/rename/delete events) are re-evaluated.
- When configuration (`rulesV2` or filter objects) changes, the hash changes and the cache **invalidates**.

This speeds periodic/bulk passes so unchanged files skip rule evaluation.

## Preview behavior

`generateMovePreview` / `generatePreviewForFile` only **lists files that would move** (`willBeMoved: true`) in the aggregated preview — blocked or unmoved files are omitted from `successfulMoves` in the current implementation.

Reasons for not moving include: blacklist hit, no matching rule, empty template result, already in target folder, or errors (surfaced on the preview entry).

## Vault events

`registerVaultEventHooks` updates history on renames, marks cache dirty on modify/create, and cleans up on delete (`src/infrastructure/plugin/vault-event-hooks.ts`).

## Import / export and performance settings

- **Import/Export** — settings JSON (see settings tab implementation).
- `enableVaultIndexCache` — when not `false`, movable and markdown file lists can be cached for large vault operations.
- `enablePerformanceDebug` — when `true`, `PerformanceTraceRecorder` logs timing spans to the console for profiling.

## See also

- [Rules and triggers](rules-and-triggers.md)
- [Blacklist filters](blacklist-filters.md)
