# Advanced Note Mover

**Automatically move notes into the right folders** — based on tags, frontmatter properties, filenames, dates, links, and more. Set your rules once, and let the plugin keep your vault organized.

> Requires Obsidian **1.5.0** or newer. Works on desktop and mobile.

---

## Why Advanced Note Mover?

Most Obsidian users hit the same wall: notes pile up in the inbox. Manually dragging them to the right folder every time is tedious and easy to skip. Advanced Note Mover lets you describe _where each type of note belongs_ using rules — then moves them for you, automatically or on demand.

- A note tagged `#project/active`? → `Projects/Active/`
- A note with a `client` property set to `Acme`? → `Clients/Acme/Notes/`
- Anything in `Templates/`? → never touched, protected by a blacklist filter

Rules are evaluated in order. The first one that matches wins. Everything else stays put.

---

## Quick start

**1. Protect what should never move**

Open **Settings → Community plugins → Advanced Note Mover → Filter** and add a line:

```
path: Templates
```

This blocks any note under your `Templates/` folder from ever being moved.

**2. Create your first rule**

Go to **Rules** → **Add rule**. Give it a name, then:

- Set a **trigger**: e.g. `tag` → `includes item` → `#inbox`
- Set a **destination folder**: e.g. `Inbox`
- Make sure the rule is toggled **active**

**3. Test it before committing**

Open a matching note and run **Preview active note movement** from the command palette. This shows exactly where the note would go — without moving anything.

**4. Move a single note**

Run **Move active note to note folder** from the command palette (or click the ribbon icon). A notification appears with an **Undo** link if you want to reverse it.

**5. Move everything**

Run **Preview bulk movement for all files** first to review what would happen across your whole vault, then **Move all files in vault** to execute.

---

## Features

### Rule-based routing

Each rule has a **name**, a **destination folder**, and one or more **trigger conditions**. Rules are checked in order — the first active rule whose conditions match wins.

Conditions can be combined with:

- **All** — every condition must match
- **Any** — at least one must match
- **None** — every condition must be false (useful for exclusion)

[Full rule reference →](docs/rules-and-triggers.md)

### Rich trigger criteria

Match notes on almost any piece of metadata:

| Criteria                    | Examples                                                  |
| --------------------------- | --------------------------------------------------------- |
| **Tag**                     | `#project/active`, any tag containing `work`              |
| **Frontmatter property**    | `status = done`, `priority > 2`, `client = Acme`          |
| **File name**               | ends with `meeting.md`, matches regex                     |
| **Parent folder**           | starts with `Inbox`                                       |
| **Created / modified date** | modified today, created before 2025, modified on a Monday |
| **Wiki links**              | note links to a specific MOC                              |
| **Embeds**                  | note embeds a specific file                               |
| **Headings**                | any heading contains `Summary`                            |
| **File extension**          | `canvas`, `md`, `base`                                    |

[Full criteria and operator reference →](docs/criteria-and-operators.md)

### Dynamic destination templates

Instead of a static folder path, use `{{tag.…}}` and `{{property.…}}` placeholders to build the destination from the note's own metadata:

```
Clients/{{property.client}}/Notes
Projects/{{property.year}}/{{tag.project}}
```

The placeholder resolves at move time — if the note has `client: Acme` in its frontmatter, it goes to `Clients/Acme/Notes`. If the value is missing, the note is not moved.

[Template syntax reference →](docs/destination-templates.md)

### Blacklist filters

Filters run **before** any rules. If a note matches any filter, it is excluded from all moves — manual, bulk, and automatic.

```
path: Templates          ← block anything under Templates/
tag: #never-move         ← block notes with this tag
fileName: Daily*.md      ← block files matching a glob pattern
property: status:draft   ← block drafts
content: DO NOT MOVE     ← block notes containing this text
```

[Filter syntax reference →](docs/blacklist-filters.md)

### Preview before you move

Every move command has a **Preview** counterpart. Preview shows you a list of files and their planned destinations — without touching anything. Use it to validate rules before a bulk move.

### Move history and undo

Every move is recorded in history. For single-file moves, an **Undo** link appears in the notification. For bulk moves, open **Show history** from the command palette to review and undo past batches.

### Automation

Set notes to move themselves:

- **On edit**: whenever you save a note (with a 2-second debounce), it is evaluated and moved if a rule matches
- **Periodic**: run a full-vault pass on a schedule (configurable interval in minutes)

Both options are off by default — enable them in **Settings → Triggers**.

### Attachment co-move

When a note moves, its referenced attachments (images, PDFs, etc.) can move with it. The plugin preserves relative paths — so if your images live in an `_assets/` folder next to your note, they'll appear in an `_assets/` folder beside the note's new location. Optionally, empty source attachment folders are cleaned up after the move.

Enable in **Settings → Attachments → Move attachments with note**.

### Canvas and Base support

`.canvas` and `.base` files are treated as movable alongside Markdown notes. Active-file commands and bulk/periodic passes include them. For these file types, use `fileName`, `folder`, or `extension` rules — tag and property criteria don't apply since Obsidian's metadata cache is Markdown-oriented.

### Import / export

Export your entire settings as JSON to back them up or share them with another vault. Import settings to restore or transfer a configuration.

---

## Documentation

|                                                                |                                                             |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| [Getting started](docs/getting-started.md)                     | Setup walkthrough, recommended workflow, safety tips        |
| [Rules and triggers](docs/rules-and-triggers.md)               | Rule structure, evaluation order, aggregation, and metadata |
| [Criteria and operators](docs/criteria-and-operators.md)       | Every trigger type and operator, with examples              |
| [Destination templates](docs/destination-templates.md)         | `{{tag.…}}` and `{{property.…}}` syntax and resolution      |
| [Blacklist filters](docs/blacklist-filters.md)                 | Filter line syntax and all supported filter types           |
| [Commands and automation](docs/commands-triggers-internals.md) | All commands, on-edit/periodic triggers, preview, caching   |

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, branch workflow, and review expectations.

| Script           | Purpose                                 |
| ---------------- | --------------------------------------- |
| `npm run dev`    | Development build (esbuild, watch mode) |
| `npm run build`  | Typecheck + production bundle           |
| `npm run test`   | Run test suite (Vitest)                 |
| `npm run lint`   | ESLint                                  |
| `npm run format` | Prettier                                |

---

## License

MIT — see [LICENSE](LICENSE).
