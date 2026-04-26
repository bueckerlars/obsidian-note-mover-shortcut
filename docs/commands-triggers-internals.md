# Commands, triggers, and internals

## Palette commands

Registered in `src/handlers/CommandHandler.ts`:

| Command ID                      | Name                                | Action                                                                                       |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `trigger-note-movement`         | Move active note to note folder     | Moves the **active** Markdown file using rules + filters; shows a notice with optional undo. |
| `trigger-note-bulk-move`        | Move all files in vault             | Scans Markdown files (via vault index cache) and attempts moves per file.                    |
| `show-history`                  | Show history                        | Opens the history modal (undo, retention UI in settings).                                    |
| `preview-bulk-movement`         | Preview bulk movement for all files | Opens preview modal for **all** Markdown files (rules on, filters on).                       |
| `preview-note-movement`         | Preview active note movement        | Preview for the active file only.                                                            |
| `add-current-file-to-blacklist` | Add current file to blacklist       | Appends `fileName: <name>` to the filter list if not already present.                        |

The ribbon icon **book-plus** calls the same path as **Move active note**.

## Triggers (automation)

Configured under **Triggers** in settings (`TriggerSettings` in `src/types/PluginData.ts`):

| Setting                  | Behavior                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enableOnEditTrigger`    | Registers `vault.on('modify')` for `.md` files; after **2s debounce**, runs the same single-file move pipeline for the changed file. Also marks the rule cache dirty. |
| `enablePeriodicMovement` | `setInterval` every `periodicMovementInterval` **minutes** to run a **full-vault** move pass (same per-file move as bulk).                                            |

Only **Markdown** (`.md`) files trigger on-edit handling.

## Move pipeline (single file)

`AdvancedNoteMover.moveFileBasedOnTags` (`src/core/AdvancedNoteMover.ts`):

1. Optional **rule evaluation cache** short-circuit (see below).
2. `RuleManagerV2.moveFileBasedOnTags` → metadata + blacklist + first matching rule + destination resolution.
3. If result is `null`, **no move**.
4. If target path equals current path, **no move**.
5. `ensureFolderExists` for the target folder, then `app.fileManager.renameFile`.
6. History entry recorded; notices/undo wired for the focused-note command.

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
- `enableVaultIndexCache` — when not `false`, markdown file lists can be cached for large vault operations.
- `enablePerformanceDebug` — when `true`, `PerformanceTraceRecorder` logs timing spans to the console for profiling.

## See also

- [Rules and triggers](rules-and-triggers.md)
- [Blacklist filters](blacklist-filters.md)
