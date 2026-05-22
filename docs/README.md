# Advanced Note Mover — Documentation

## Contents

| Page                                                      | What you'll find                                                     |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| [Getting started](getting-started.md)                     | Step-by-step setup, recommended workflow, and safety tips            |
| [Rules and triggers](rules-and-triggers.md)               | Rule structure, evaluation order, aggregation, and file metadata     |
| [Criteria and operators](criteria-and-operators.md)       | Every match criteria type and operator, with examples                |
| [Destination templates](destination-templates.md)         | Dynamic folder paths using `{{tag.…}}` and `{{property.…}}`          |
| [Blacklist filters](blacklist-filters.md)                 | How to exclude notes from all moves using filter lines               |
| [Commands and automation](commands-triggers-internals.md) | All commands, on-edit/periodic triggers, caching, and move internals |

## How it works in one paragraph

You define **blacklist filters** (notes that should never move) and **rules** (where matching notes should go). When a move runs — manually, on edit, or on a schedule — each note is checked against the blacklist first. If it passes, rules are evaluated in order. The first active rule whose conditions match determines the destination. The note is renamed (moved) to that folder. Everything else stays put.

## Key facts

- **Rules** decide _where_ a note goes; the **first active** matching rule wins
- **Blacklist filters** run first: any match prevents the move entirely
- **Markdown** (`.md`), **Canvas** (`.canvas`), and **Base** (`.base`) files are movable
- **Destination templates** let you build folder paths dynamically from a note's own tags and properties
- Rules can be previewed without executing any moves
- Every move is recorded in history and can be undone
