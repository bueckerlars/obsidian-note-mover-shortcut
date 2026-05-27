# Criteria and operators

This page documents every criteria type and its available operators. All string comparisons use **case-insensitive** matching unless noted. Regular expressions are compiled with the `i` flag (case-insensitive).

---

## Quick reference

| Criteria type | What it matches on                  | Operator family                        |
| ------------- | ----------------------------------- | -------------------------------------- |
| `fileName`    | Full file name including extension  | Text                                   |
| `folder`      | Parent folder path (vault-relative) | Text                                   |
| `extension`   | File extension without dot          | Text                                   |
| `tag`         | All tags on the note                | List                                   |
| `links`       | Outgoing wiki-link targets          | List                                   |
| `embeds`      | Embedded file targets               | List                                   |
| `headings`    | All heading texts                   | List                                   |
| `created_at`  | File creation timestamp             | Date                                   |
| `modified_at` | File modification timestamp         | Date                                   |
| `properties`  | Any frontmatter property            | Text / Number / List / Date / Checkbox |

---

## Text operators

Used by `fileName`, `folder`, `extension`, and `properties` with `propertyType: text`.

| Operator               | Matches when                                             |
| ---------------------- | -------------------------------------------------------- |
| `is`                   | Value equals the operand (exact, case-insensitive)       |
| `is not`               | Value does not equal the operand                         |
| `contains`             | Value contains the operand as a substring                |
| `does not contain`     | Value does not contain the substring                     |
| `starts with`          | Value begins with the operand                            |
| `does not starts with` | Value does not begin with the operand                    |
| `ends with`            | Value ends with the operand                              |
| `does not ends with`   | Value does not end with the operand                      |
| `match regex`          | Value matches the regex pattern; invalid pattern → false |
| `does not match regex` | Value does not match the regex; invalid pattern → true   |

**Examples:**

- `fileName` → `ends with` → `meeting.md` — matches any note whose filename ends in `meeting.md`
- `folder` → `starts with` → `Projects` — matches notes anywhere under a `Projects` folder
- `fileName` → `match regex` → `^\d{4}-\d{2}-\d{2}` — matches date-prefixed filenames

---

## `fileName`

Operand: the note's full file name including extension (e.g. `My Meeting Note.md`).

Uses **text operators**.

---

## `folder`

Operand: the parent folder path of the file (vault-relative, all segments before the final `/`). A note at the vault root has an empty string `""` as its folder.

Uses **text operators**.

**Example:** a file at `Projects/2026/Q1/Note.md` has folder operand `Projects/2026/Q1`.

---

## `extension`

Operand: the file extension **without** a leading dot (e.g. `md`, `canvas`, `base`).

Uses **text operators**.

---

## List operators

Used by `tag`, `links`, `embeds`, `headings`, and `properties` with `propertyType: list`.

| Operator                | Matches when                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `includes item`         | The list contains an item equal to `value`                      |
| `does not include item` | No item in the list equals `value`                              |
| `all are`               | At least one item exists, and every item equals `value`         |
| `all start with`        | At least one item exists, and every item starts with `value`    |
| `all end with`          | At least one item exists, and every item ends with `value`      |
| `all match regex`       | At least one item exists, and every item matches the regex      |
| `any contain`           | At least one item contains `value` as a substring               |
| `any end with`          | At least one item ends with `value`                             |
| `any match regex`       | At least one item matches the regex                             |
| `none contain`          | No item contains `value`                                        |
| `none start with`       | No item starts with `value`                                     |
| `none end with`         | No item ends with `value`                                       |
| `count is`              | Number of items equals `value` (integer)                        |
| `count is not`          | Number of items does not equal `value`                          |
| `count is less than`    | Number of items is less than `value`; invalid number → false    |
| `count is more than`    | Number of items is greater than `value`; invalid number → false |

---

## `tag`

Operand: the list of tags from Obsidian's tag index (e.g. `#work/project`). Tags include the `#` prefix. All comparisons are case-insensitive.

Uses **list operators**.

**Examples:**

- `includes item` → `#inbox` — note has `#inbox` or any nested tag under it (e.g. `#inbox/todo`); does **not** match unrelated tags like `#inbox2` (hierarchy uses `/`, not substring prefix)
- `does not include item` → `#archive` — note has neither `#archive` nor any tag under `#archive/…`
- `all start with` → `#project` — every tag on the note is `#project` or a nested child (`#project/…`)
- `none start with` → `#archive` — note has no `#archive` tag and no tag under `#archive/…` (does not treat `#archive2024` as a match)
- `any contain` → `work` — any tag contains the substring "work" (matches `#work`, `#work/project`, etc.; substring, not hierarchy)
- `count is more than` → `3` — note has more than 3 tags

---

## `links`

Operand: outgoing wiki-link targets from Obsidian's metadata cache (text inside `[[…]]`).

Uses **list operators**.

**Example:** `includes item` → `Projects MOC` — note links to `[[Projects MOC]]`.

---

## `embeds`

Operand: embed targets from Obsidian's metadata cache (text inside `![[…]]`).

Uses **list operators**.

---

## `headings`

Operand: all heading text strings from Obsidian's metadata cache. Headings are stored without `#` prefixes.

Uses **list operators**.

**Example:** `any contain` → `Summary` — note has at least one heading containing the word "Summary".

---

## Date operators

Used by `created_at`, `modified_at`, and `properties` with `propertyType: date`.

If the date is missing or cannot be parsed, all date operators return **false**.

| Operator                                                | Matches when                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| `is`                                                    | Timestamp exactly equals the parsed `value`                    |
| `is before` / `is after`                                | Full date comparison against parsed `value`                    |
| `time is before` / `time is after`                      | Timestamp comparison against parsed `value`                    |
| `time is before now` / `time is after now`              | Comparison against the current time at evaluation              |
| `date is` / `date is not`                               | Same calendar day as parsed `value`                            |
| `date is before` / `date is after`                      | Calendar-day comparison (midnight-normalized)                  |
| `date is today` / `date is not today`                   | Relative to today at evaluation time                           |
| `is under X days ago`                                   | Whole-day difference from now is less than `value` days        |
| `is over X days ago`                                    | Whole-day difference from now is greater than `value` days     |
| `day of week is` / `is not`                             | `value` is a full English weekday name (`sunday` … `saturday`) |
| `day of week is before` / `is after`                    | Compares weekday index to the named weekday                    |
| `day of month is` / `is not` / `is before` / `is after` | Day-of-month number from `value`                               |
| `month is` / `is not` / `is before` / `is after`        | Month number 1–12 in `value`                                   |
| `year is` / `is not` / `is before` / `is after`         | Four-digit year in `value`                                     |

`value` is passed to `new Date(value)` for operators needing a reference date; an unparseable string results in **false**.

**Examples:**

- `modified_at` → `date is today` — note was modified today
- `created_at` → `is over X days ago` → `90` — note is older than 90 days
- `modified_at` → `day of week is` → `saturday` — note was last modified on a Saturday
- `created_at` → `year is` → `2024` — note was created in 2024

---

## `properties`

Match on any frontmatter property. Requires `propertyName` (the frontmatter key) and `propertyType` (what kind of value to expect).

### Base operators (work for all property types)

| Operator              | Matches when                                                |
| --------------------- | ----------------------------------------------------------- |
| `has any value`       | Property exists and is not null, undefined, or empty string |
| `has no value`        | Property is null, undefined, or empty string                |
| `property is present` | Frontmatter contains the key (even if the value is null)    |
| `property is missing` | Frontmatter does not contain the key                        |

### `propertyType: text`

Casts the value to a string and uses **text operators**.

**Example:** `properties` → `status` (text) → `is` → `done`

### `propertyType: number`

Parses both the property value and `value` as numbers. Invalid values result in **false**.

| Operator                        | Matches when                            |
| ------------------------------- | --------------------------------------- |
| `equals` / `does not equal`     | Numeric equality                        |
| `is less than` / `is more than` | Numeric comparison                      |
| `is divisible by`               | Modulo — divisor 0 always returns false |
| `is not divisible by`           | Not divisible                           |

**Example:** `properties` → `priority` (number) → `is more than` → `2`

### `propertyType: list`

Normalizes the property value to an array of strings (handles native arrays, comma-separated strings, and newline-separated strings). Then uses **list operators**.

**Example:** `properties` → `tags` (list) → `includes item` → `work`

### `propertyType: date`

Converts the property value to a `Date` (supports Date instances, ISO strings, and timestamps). Invalid or missing → **false**. Then uses **date operators**.

**Example:** `properties` → `due` (date) → `date is before` → `2026-01-01`

### `propertyType: checkbox`

Coerces to boolean.

| Operator   | Matches when             |
| ---------- | ------------------------ |
| `is true`  | Property value is truthy |
| `is false` | Property value is falsy  |

**Example:** `properties` → `published` (checkbox) → `is true`

---

## Regex performance note

The engine pre-warms regex patterns for all rules when they are loaded, so repeated rule checks don't recompile patterns on hot paths (important for periodic or on-edit automation).

---

## See also

- [Rules and triggers](rules-and-triggers.md)
- [Destination templates](destination-templates.md)
