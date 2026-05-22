# Blacklist filters

Blacklist filters are a safety net. They run **before** any rules, and if a note matches even one filter line, it is excluded from all moves — manual, bulk, on-edit, and periodic.

Think of filters as a set of "never touch these" declarations. Set them up once for your templates, archives, and system notes, and you won't have to worry about rules accidentally moving them.

---

## How filters work

The filter list is an **OR** blacklist: a note is blocked if it matches **any** filter line. The order of lines doesn't matter.

An empty filter list means "nothing is excluded by filters" — everything is eligible to be moved by rules.

---

## Line format

Each line follows this pattern:

```
<type>: <value>
```

For example:

```
path: Templates
tag: #never-move
fileName: Daily*.md
property: status:draft
content: DO NOT MOVE
created_at: 2026-04
```

Unknown `type` values are silently ignored (the line never matches anything).

---

## Filter types

### `path:`

Blocks a specific file or everything under a folder.

- `path: Templates` — blocks `Templates/Note.md` and anything nested under `Templates/`
- `path: Archive/2020` — blocks everything under `Archive/2020/`
- `path: Daily Notes/2024-01-01.md` — blocks a specific file

The match is: the file's vault-relative path equals `value`, **or** the path starts with `value + /`.

---

### `tag:`

Blocks notes that have a specific tag or any subtag under it.

- `tag: #never-move` — blocks notes tagged `#never-move`
- `tag: #archive` — blocks notes tagged `#archive`, `#archive/2024`, `#archive/projects`, etc.

A note matches if any of its tags equals `value` exactly, or starts with `value + /` (hierarchy prefix match).

---

### `fileName:`

Blocks notes whose filename matches a pattern.

- `fileName: _index.md` — blocks the exact file named `_index.md`
- `fileName: Daily*.md` — blocks any file matching the glob (e.g. `Daily Note.md`, `Daily 2026-05-21.md`)
- `fileName: *.canvas` — blocks all canvas files

Pattern rules:

- If the pattern contains `*` or `?`: treated as a glob (`*` → any characters, `?` → any single character), case-insensitive full-filename match.
- Otherwise: case-insensitive exact equality against the full filename.

---

### `property:`

Blocks notes based on a frontmatter property.

**Check for key presence:**

```
property: status
```

Blocks notes where `status` exists and has a non-null/non-undefined value.

**Check for a specific value:**

```
property: status:draft
```

Blocks notes where `status` equals `draft` (case-insensitive). If the property is a list, blocks notes where any list item equals `draft`.

---

### `content:`

Blocks notes whose raw file body contains a specific substring.

```
content: DO NOT MOVE
content: <!-- archived -->
```

**Performance note:** content filters require reading the full file body. If any `content:` line is present in your filter list, the plugin must perform a `vault.read()` for each evaluated file. For large vaults, prefer other filter types (tag, path, property) when possible and use `content:` only when necessary.

---

### `created_at:` and `updated_at:`

Blocks notes based on their creation or modification timestamp using an ISO prefix match.

```
created_at: 2026-04       ← created in April 2026
updated_at: 2026-05-21    ← last modified on 2026-05-21
created_at: 2024          ← created any time in 2024
```

The file's timestamp is formatted as a full ISO string (e.g. `2026-04-15T10:30:00.000Z`). A note matches if that string **starts with** your `value`.

---

## Practical filter setups

### Protect system folders

```
path: Templates
path: .obsidian
path: _attachments
```

### Protect by tag

```
tag: #never-move
tag: #template
tag: #pinned
```

### Protect by filename pattern

```
fileName: _*.md
fileName: README.md
fileName: MOC*.md
```

### Protect drafts

```
property: status:draft
property: published:false
```

### Protect notes with a specific note body marker

```
content: <!-- do not move -->
```

---

## Quick command: add current file to blacklist

From the command palette, run **Add current file to blacklist**. This instantly appends `fileName: <current filename>` to your filter list — useful for protecting a specific note without opening settings.

---

## See also

- [Rules and triggers](rules-and-triggers.md) — filters run before any rules are evaluated
- [Commands and automation](commands-triggers-internals.md) — `add-current-file-to-blacklist` command
