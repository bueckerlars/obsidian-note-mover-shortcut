# Commands and automation

---

## Commands

All commands are available from the **command palette** (Ctrl/Cmd+P). Active-file commands only appear when a Markdown, Canvas, or Base file is open and focused.

| Command                                 | What it does                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Move active note to note folder**     | Evaluates the current note against your rules and moves it if a rule matches. Shows a notification with an Undo link. Also accessible via the ribbon icon. |
| **Move all files in vault**             | Scans every movable file in the vault and moves each one that matches a rule.                                                                              |
| **Preview active note movement**        | Shows where the current note _would_ go — without moving anything.                                                                                         |
| **Preview bulk movement for all files** | Shows a full list of planned moves for every file in the vault — without moving anything.                                                                  |
| **Show history**                        | Opens the move history modal. View past moves and undo bulk operations.                                                                                    |
| **Add current file to blacklist**       | Appends `fileName: <current filename>` to your filter list, protecting the open note from future moves.                                                    |

### Bulk move: stop mid-run

When you execute moves from the **Preview bulk movement** modal, a **Stop** button appears during execution. Clicking it cancels remaining moves. Completed moves up to that point remain in history and can be reviewed or undone.

---

## Automation

Automation options are configured in **Settings → Triggers**.

### On-edit trigger

When enabled, the plugin watches for file modifications. Two seconds after you stop editing a Markdown, Canvas, or Base file, it is automatically evaluated and moved if a rule matches.

The 2-second debounce prevents moves from firing mid-edit. Only the file you edited is evaluated — not the whole vault.

**When to use:** works well when you tag notes as you write them and want them to file themselves as soon as you add the right tag. Keep an eye on your blacklist filters — they protect notes you're actively working on from being moved unexpectedly.

### Periodic trigger

When enabled, the plugin runs a full-vault evaluation pass on a fixed interval (configured in minutes). Every movable file is checked, and any that match a rule are moved.

The **rule evaluation cache** (on by default) makes periodic passes efficient: files that haven't changed since the last evaluation and whose rules haven't changed are skipped automatically.

**When to use:** useful for vaults where notes accumulate over time and you want them periodically sorted without manual intervention.

---

## Attachment co-move

Configured in **Settings → Attachments → Move attachments with note**.

When enabled, moving a Markdown note also moves referenced attachments that live in the same folder subtree. The relative path structure is preserved — attachments in `_assets/` next to the note move to `_assets/` next to the new note location.

Options:

| Option                         | Description                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Move attachments with note** | Master toggle. Off by default for upgrades; on for new installs.                                                      |
| **Skip shared attachments**    | If an attachment is referenced by more than one note, it is not moved (to avoid breaking the other note's reference). |
| **Delete empty asset folders** | After moving attachments, removes the source folder if it is now empty.                                               |

Undo restores both the note and any co-moved attachments to their original locations.

---

## Movable file types

The following file types are processed by all commands (active, bulk, periodic, on-edit, and preview):

- **Markdown** (`.md`)
- **Canvas** (`.canvas`)
- **Base** (`.base`)

Images, PDFs, and other attachment files are **not** moved directly — only as part of attachment co-move when enabled.

**Canvas and Base notes:** Obsidian's metadata cache is Markdown-oriented, so tag, property, link, heading, and embed criteria typically do not apply to `.canvas` and `.base` files. Use `fileName`, `folder`, or `extension` rules for these types.

---

## Preview behavior

Preview commands calculate planned moves using the same rule and filter evaluation as the real move commands — but without renaming any files. The preview modal shows:

- Which files would move
- Their current path and planned destination
- Which rule matched

Files that would not move (already in destination, blocked by filter, or no matching rule) are omitted from the preview list.

---

## Move history and undo

Every move is recorded in history. Access it via **Show history** in the command palette.

- **Single-file moves**: an Undo link appears in the notification immediately after the move.
- **Bulk moves**: the history modal shows past batches with the files moved and lets you undo entire batches, including any attachment co-moves.

History retention is configurable in **Settings → History**.

---

## Performance options

Configured in **Settings → Performance / debug**.

### Rule evaluation cache

On by default. Stores the last matched destination per file (keyed by path + modification time + rules/filters hash). When a file hasn't changed and the rules haven't changed, it is skipped during bulk and periodic passes.

The cache is automatically invalidated when you edit a file, rename or delete a file, or change your rules or filters.

### Vault index cache

When enabled, caches the list of movable files for bulk operations. Useful in very large vaults where scanning for movable files is slow.

### Performance debug tracing

When enabled, logs timing spans to the browser console for each evaluation step. Use this if you're diagnosing slow rule evaluation in a large vault.

---

## See also

- [Rules and triggers](rules-and-triggers.md)
- [Blacklist filters](blacklist-filters.md)
