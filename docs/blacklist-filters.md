# Blacklist filters

Blacklist filters are **not** Rule V2 triggers. They are a separate list of strings (`settings.filters.filter[].value`) interpreted by `BlacklistFilterEngine` (`src/domain/filters/blacklist-filter-engine.ts`).

## Semantics

- The list is an **OR** blacklist: if **any** single filter line matches a file, that file is **excluded** from moves (manual, bulk, periodic, on-edit — whenever filters are not skipped).
- An **empty** filter list means “no blacklist” — nothing is excluded by filters.
- Matching uses the same `FileMetadata` object as rules (including `fileContent` when loaded).

## Line format

Each non-empty line should match:

```text
<type>: <rest>
```

Leading/trailing spaces around the value depend on the parser: the engine uses a regex `^([a-zA-Z_]+):\s*(.*)$` for the initial split — the type name is **letters and underscore only**.

Supported `type` values (lowercase as stored, matching is case-sensitive on the type keyword):

| Type         | Behavior                                                             |
| ------------ | -------------------------------------------------------------------- |
| `tag`        | See [Tag matching](#tag-matching).                                   |
| `fileName`   | See [File name matching](#file-name-matching).                       |
| `path`       | Exact path **or** any file whose path starts with `value + '/'`.     |
| `content`    | Substring search in **full file body** (requires read — see below).  |
| `created_at` | File creation time: `createdAt.toISOString().startsWith(value)`.     |
| `updated_at` | File modification time: `updatedAt.toISOString().startsWith(value)`. |
| `property`   | See [Property matching](#property-matching).                         |

Unknown types → line never matches.

## Tag matching

`value` is the tag string as stored on files (often including `#`). A file matches if:

- any tag **equals** `ruleTag`, **or**
- any tag **starts with** `ruleTag + '/'` (hierarchy prefix).

## File name matching

If `pattern` equals the filename → match.

Else if the pattern contains `*` or `?` → glob-style: `*` → `.*`, `?` → `.`, other regex specials escaped, **case-insensitive** full-string match.

Else → case-insensitive string equality against the full filename.

## Property matching

The substring after `property:` is parsed as `key` or `key:value`:

- **No `:` in the rest** (or only key): key must exist and value must not be `null`/`undefined`.
- **`key:value`**: if the frontmatter value is a **list** (detected via list heuristics), any list item must equal `value` (case-insensitive). Otherwise the property stringifies and is compared case-insensitively to `value`.

## Content filters and performance

If **any** filter line is a content filter, `filtersNeedContent` (`src/domain/filters/filter-needs-content.ts`) returns true when the trimmed line matches `content:` (case-insensitive). Then `extractFileMetadataV2` is called with **`needsContent: true`**, which performs `vault.read(file)` to populate `fileContent`.

Without `content:` filters, the blacklist can run **without** reading file bodies (faster).

## Examples

| Line                     | Effect                                                          |
| ------------------------ | --------------------------------------------------------------- |
| `path: Templates`        | Blocks `Templates/Note.md` and anything under `Templates/`.     |
| `tag: #never-move`       | Blocks notes with that tag or nested tags under it.             |
| `fileName: Daily*.md`    | Blocks names matching the glob.                                 |
| `content: DO NOT MOVE`   | Blocks notes whose raw body contains that substring.            |
| `property: status:draft` | Blocks when `status` resolves to `draft` (or list contains it). |
| `created_at: 2026-04`    | Blocks files whose ISO timestamp string starts with `2026-04`.  |

## See also

- [Rules and triggers](rules-and-triggers.md) — filters run before rule matching
- [Commands, triggers, and internals](commands-triggers-internals.md) — command that appends a filename to the blacklist
