# Getting started

## What this plugin does

Advanced Note Mover evaluates your notes against a set of **rules** you define and moves matching notes to the folders you specify. You describe the conditions; the plugin does the filing.

The evaluation works like this:

1. **Blacklist filters** run first. If a note matches any filter, it is not moved — no matter what the rules say.
2. **Rules** are checked in order. The first active rule whose conditions all match (or any match, or none match — depending on your aggregation setting) wins.
3. The winning rule's **destination** is resolved, which may include dynamic placeholders.
4. The note is moved. If the note is already in the destination folder, nothing happens.

---

## Setting up for the first time

Open **Settings → Community plugins → Advanced Note Mover**. The settings tab has these sections:

| Section                 | What to configure                                       |
| ----------------------- | ------------------------------------------------------- |
| **Triggers**            | Automation: move-on-edit and periodic full-vault passes |
| **Filter**              | Blacklist lines — notes that should never be moved      |
| **Rules**               | Your named routing rules                                |
| **Attachments**         | Co-move images and files referenced by a note           |
| **History**             | View and undo past moves                                |
| **Import / Export**     | Backup and restore your configuration                   |
| **Performance / debug** | Caching options and performance tracing                 |

### Step 1: protect notes that must never move

Before creating any rules, add blacklist filters for paths that should be untouched. Common examples:

```
path: Templates
path: Archive
tag: #never-move
fileName: _*.md
```

Each line is an OR condition — a note matching _any_ line is blocked. See [Blacklist filters](blacklist-filters.md) for the full syntax.

### Step 2: create your first rule

Click **Add rule** in the Rules section. Every rule needs:

- **Name** — used in previews and history, so make it descriptive
- **Trigger(s)** — one or more conditions that identify matching notes
- **Aggregation** — how triggers combine: `all` (every must match), `any` (at least one), or `none` (exclusion)
- **Destination** — the folder to move matching notes into

**Example: route inbox notes by tag**

| Field       | Value                              |
| ----------- | ---------------------------------- |
| Name        | `Inbox routing`                    |
| Trigger     | `tag` → `includes item` → `#inbox` |
| Aggregation | `any`                              |
| Destination | `Inbox`                            |

**Example: route client notes by property**

| Field       | Value                                            |
| ----------- | ------------------------------------------------ |
| Name        | `Client notes`                                   |
| Trigger     | `properties` → `client` (text) → `has any value` |
| Aggregation | `all`                                            |
| Destination | `Clients/{{property.client}}/Notes`              |

The `{{property.client}}` placeholder is filled in with the note's actual `client` frontmatter value at move time. See [Destination templates](destination-templates.md).

### Step 3: preview before moving

**Always preview before running a bulk move.** From the command palette:

- **Preview active note movement** — shows where the currently open note would go
- **Preview bulk movement for all files** — shows where every note in your vault would go

Preview never moves anything. It just tells you what _would_ happen.

### Step 4: move notes

Once you're satisfied with the preview:

- **Move active note to note folder** — moves the currently open note
- **Move all files in vault** — moves all matching notes across the vault

Both commands are in the command palette. **Move active note** also has a ribbon icon (book with a plus).

---

## Recommended workflow

1. **Start narrow.** Create one rule and test it with Preview on a few notes before enabling automation.
2. **Order rules carefully.** Rules are checked top to bottom. If two rules could match the same note, put the more specific one first.
3. **Use blacklists liberally.** It's easier to unblock a note later than to undo an unexpected bulk move.
4. **Validate templates.** If you use `{{property.…}}` placeholders, preview a note and confirm the property is spelled correctly — a missing property means the destination resolves to an empty path, and the note won't move.
5. **Enable automation last.** Once your rules are stable and tested, enable on-edit or periodic triggers.

---

## Safety tips

- **Back up your vault** (or use version control) before your first bulk move.
- The **Undo** link in move notifications reverses a single-file move instantly.
- **Show history** (command palette) lets you review and undo past bulk operations.
- The **Preview bulk movement** modal supports **Stop** mid-execution if you change your mind.
- The `Add current file to blacklist` command instantly protects any open note by appending its filename to your filter list.

---

## See also

- [Rules and triggers](rules-and-triggers.md) — full rule structure and evaluation logic
- [Criteria and operators](criteria-and-operators.md) — all trigger types with examples
- [Destination templates](destination-templates.md) — dynamic folder paths
- [Blacklist filters](blacklist-filters.md) — protecting notes from moves
- [Commands and automation](commands-triggers-internals.md) — all commands and automation options
