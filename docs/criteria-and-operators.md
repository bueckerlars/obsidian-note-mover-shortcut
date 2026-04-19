# Criteria and operators

This page matches `RuleMatcherV2Engine` in `src/domain/rules/v2/RuleMatcherV2Engine.ts`. String comparisons for **text criteria** use **case-insensitive** literal matching unless noted. **Regular expressions** are compiled with the **`i`** flag (case-insensitive).

---

## `fileName`

**Operand:** the note’s `fileName` (full name with extension).

**Operators** (text):

| Operator                               | True when                                               |
| -------------------------------------- | ------------------------------------------------------- |
| `is`                                   | Name equals `value` (case-insensitive).                 |
| `is not`                               | Not equal.                                              |
| `contains`                             | Name contains substring.                                |
| `does not contain`                     | Does not contain substring.                             |
| `starts with` / `does not starts with` | Prefix tests.                                           |
| `ends with` / `does not ends with`     | Suffix tests.                                           |
| `match regex`                          | Regex matches; invalid regex pattern → **false**.       |
| `does not match regex`                 | Regex does not match; invalid regex pattern → **true**. |

**Example:** `ends with` + `meeting.md` keeps the suffix match on the full filename.

---

## `folder`

**Operand:** the **parent path** of the file: all path segments before the final `/` (vault-relative). For a file at the vault root, this is the empty string `""`.

Same **text operators** as `fileName`.

**Example:** file `Projects/2026/Q1/Note.md` → folder operand is `Projects/2026/Q1`.

---

## `extension`

**Operand:** the file extension string from Obsidian (e.g. `md`), **without** a leading dot.

Same **text operators** as `fileName`.

---

## `tag`

**Operand:** the list of tags from Obsidian’s tag index (strings like `#work/project`).

**Operators** (list):

| Operator                                    | True when                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `includes item`                             | Some tag equals `value` (case-insensitive).                             |
| `does not include item`                     | No tag equals `value`.                                                  |
| `all are`                                   | At least one tag, and every tag equals `value` (case-insensitive).      |
| `all start with`                            | At least one tag, and every tag starts with `value` (case-insensitive). |
| `all end with`                              | At least one tag, and every tag ends with `value`.                      |
| `all match regex`                           | At least one tag, every tag matches regex; invalid regex → **false**.   |
| `any contain`                               | Some tag contains substring.                                            |
| `any end with`                              | Some tag ends with substring.                                           |
| `any match regex`                           | Some tag matches regex; invalid regex → **false**.                      |
| `none contain`                              | No tag contains substring.                                              |
| `none start with`                           | No tag starts with substring.                                           |
| `none end with`                             | No tag ends with substring.                                             |
| `count is` / `count is not`                 | Tag count vs integer in `value`.                                        |
| `count is less than` / `count is more than` | Numeric comparison; invalid number in `value` → **false**.              |

---

## `links`

**Operand:** outgoing wiki link targets from the metadata cache (strings inside `[[...]]` resolution).

**Operators:** same **list** family as `tag`.

---

## `embeds`

**Operand:** embed targets from the metadata cache (`![[...]]`).

**Operators:** same **list** family as `tag`.

---

## `headings`

**Operand:** array of **heading text** strings from the metadata cache (no `#` prefix in the stored strings).

**Operators:** implemented with the same **list** engine as `tag` (not plain “text contains one string” unless you use `any contain`).

---

## `created_at` and `modified_at`

**Operands:** `createdAt` / `updatedAt` from file stats. If the date is missing (`null`), **all** date operators return **false**.

**Operators** (date) — `value` usage:

| Operator                                                | Meaning                                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `is`                                                    | Exact **timestamp** equality (`getTime`) with parsed `value`.                |
| `is before` / `is after`                                | Compare full `Date` objects to parsed `value`.                               |
| `time is before` / `time is after`                      | Compare `getTime()` to parsed `value`.                                       |
| `time is before now` / `time is after now`              | Compare to current time.                                                     |
| `date is` / `date is not`                               | Same **calendar day** as parsed `value` / not same day.                      |
| `date is before` / `date is after`                      | Calendar-day comparison (midnight-normalized internally).                    |
| `date is today` / `date is not today`                   | Relative to “today” at evaluation time.                                      |
| `is under X days ago` / `is over X days ago`            | `value` must parse as a number (days). Uses whole-day difference vs **now**. |
| `day of week is` / `is not`                             | `value` is a **full English weekday name** (`sunday` … `saturday`).          |
| `day of week is before` / `is after`                    | Compare `getDay()` index to the named weekday.                               |
| `day of month is` / `is not` / `is before` / `is after` | Numeric day-of-month from `value`.                                           |
| `month is` / `is not` / `is before` / `is after`        | Month number **1–12** in `value`.                                            |
| `year is` / `is not` / `is before` / `is after`         | Four-digit year in `value`.                                                  |

**Parsing:** `value` is passed to `new Date(value)` for operators that need a reference date; invalid parse → **false** where a reference date is required.

---

## `properties`

Requires `propertyName`. Use `propertyType` to select evaluation:

### Base operators (all property types)

Evaluated **before** type-specific logic:

| Operator              | True when                                       |
| --------------------- | ----------------------------------------------- |
| `has any value`       | Value is not `null`/`undefined` and not `''`.   |
| `has no value`        | `null`/`undefined` or `''`.                     |
| `property is present` | Frontmatter **has** the key (`hasOwnProperty`). |
| `property is missing` | Key is absent.                                  |

### `propertyType: 'text'`

Uses **text operators** (same as `fileName`) on `String(propertyValue)`.

If the value is `null`/`undefined`, type-specific checks return **false** (except base operators above).

### `propertyType: 'number'`

Parses property and `value` with `Number(...)`; invalid → **false**.

| Operator                                  | Condition                        |
| ----------------------------------------- | -------------------------------- |
| `equals` / `does not equal`               | Numeric equality.                |
| `is less than` / `is more than`           | Numeric order.                   |
| `is divisible by` / `is not divisible by` | Modulo; divisor `0` → **false**. |

### `propertyType: 'list'`

The value is normalized to `string[]` via `parseListProperty` (arrays, comma- or newline-separated strings). Then **list operators** (same as `tag`) apply.

### `propertyType: 'date'`

Converts property to `Date` (`Date` instance, ISO string, or number timestamp). Invalid/missing → **false**. Then **date operators** (same family as `created_at`) apply to that date.

### `propertyType: 'checkbox'`

Coerces to boolean with `Boolean(value)`.

| Operator   | True when         |
| ---------- | ----------------- |
| `is true`  | Boolean is true.  |
| `is false` | Boolean is false. |

---

## Regex performance

The engine **pre-warms** regex patterns for operators that use regex (`warmRegexCacheFromRules`), so repeated matches avoid recompilation on hot paths.

---

## See also

- [Rules and triggers](rules-and-triggers.md)
- [Destination templates](destination-templates.md)
