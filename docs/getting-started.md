# Getting started

## What this plugin does

Advanced Note Mover evaluates each Markdown note against your **blacklist filters** and **rules**. If the note passes the blacklist and a rule matches, the plugin **renames** the file so it sits under the rule’s **destination folder** (a plain path or a path built from a **destination template**).

The evaluation engine is **Rule V2** (`rulesV2` in settings). Older rule formats may be migrated automatically on load; the persisted model is V2-only.

## Where to configure

Open **Settings → Community plugins → Advanced Note Mover** (or your localized equivalent). The settings tab is organized into sections:

- **Triggers** — optional automation (on-edit, periodic full-vault pass).
- **Filter** — blacklist lines (exclusions).
- **Rules** — named rules with triggers, aggregation, and destination.
- **History**, **Import/Export**, and **Performance / debug** — operational tooling.

## Recommended workflow

1. **Define blacklist filters** for anything that must never be moved (templates, scratch notes, archived paths).
2. **Add rules** in priority order (first match wins). Start with narrow rules and use **Preview** before bulk moves.
3. Use **Move active note** or **Preview active note** to validate a single file.
4. Use **Preview bulk movement** before **Move all files in vault**.

## Safety notes

- **Back up your vault** or use version control before large bulk moves.
- **Preview** shows intent; it is still worth spot-checking destinations for template-heavy rules.
- **Undo** is available via notifications (single move) and history (bulk/periodic batches where supported).

## See also

- [Rules and triggers](rules-and-triggers.md)
- [Blacklist filters](blacklist-filters.md)
- [Commands, triggers, and internals](commands-triggers-internals.md)
