# Advanced Note Mover — Wiki

## Contents

| Topic                                                               | Description                                                                   |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Getting started](getting-started.md)                               | What the plugin does, settings entry points, and safety tips                  |
| [Rules and triggers](rules-and-triggers.md)                         | Rule structure, evaluation order, aggregation, and how file metadata is built |
| [Criteria and operators](criteria-and-operators.md)                 | Every trigger criteria type and operator semantics                            |
| [Destination templates](destination-templates.md)                   | `{{tag...}}` and `{{property...}}` syntax and resolution rules                |
| [Blacklist filters](blacklist-filters.md)                           | Filter line format (`tag:`, `path:`, `content:`, …) and performance           |
| [Commands, triggers, and internals](commands-triggers-internals.md) | Palette commands, automation, cache, preview, and move behavior               |

## Quick facts

- **Rules** decide _where_ a note may go; the first **active** rule whose triggers match wins.
- **Blacklist filters** run first: if _any_ filter line matches the file, it is **not** moved.
- **Markdown only** for automatic triggers and most move paths (`.md` files).

For project setup, contributing, and license, see the repository [README](../README.md).
