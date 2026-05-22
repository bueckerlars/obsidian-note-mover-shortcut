# Destination templates

Instead of a fixed folder path, a rule's destination can include **placeholders** that are filled in from the note's own tags and frontmatter properties at move time. This lets one rule route notes to many different folders based on their content.

---

## Syntax

Placeholders are wrapped in double braces: `{{ … }}`.

The inner text must start with `tag.` or `property.`, followed by a key:

```
{{tag.<key>}}
{{property.<key>}}
```

Static path segments can appear before, between, or after placeholders:

```
Clients/{{property.client}}/Notes
Archive/{{property.year}}/{{property.project}}
Areas/{{tag.work}}
```

### Valid examples

| Template                             | What it produces                                       |
| ------------------------------------ | ------------------------------------------------------ |
| `Projects/{{property.client}}/Notes` | `Projects/Acme/Notes` (if `client: Acme`)              |
| `Areas/{{tag.work/personal}}`        | `Areas/work/personal` (if tag `#work/personal` exists) |
| `Archive/{{property.year}}`          | `Archive/2025` (if `year: 2025`)                       |
| `Inbox/{{property.status}}`          | `Inbox/done` (if `status: done`)                       |

### Invalid examples (will fall back to raw string)

| Template                    | Problem                                            |
| --------------------------- | -------------------------------------------------- |
| `Clients/{{property.client` | Unclosed `{{`                                      |
| `Clients/{{}}`              | Empty placeholder                                  |
| `Clients/{{property}}`      | Missing key after prefix                           |
| `Clients/{{category.foo}}`  | Unknown prefix (only `tag` and `property` allowed) |

---

## `{{property.<key>}}`

Looks up `<key>` in the note's frontmatter.

| Frontmatter value           | Resolves to                            |
| --------------------------- | -------------------------------------- |
| A string                    | The string as-is                       |
| A number or boolean         | Converted to string                    |
| An array                    | Items joined with `, ` (comma + space) |
| Missing, null, or undefined | Empty string                           |

**If the placeholder resolves to an empty string**, that segment of the path is missing. If the _entire_ destination resolves to empty or whitespace, the note is **not moved**.

---

## `{{tag.<key>}}`

Looks for a tag that matches `<key>`, adding a `#` prefix if not present.

Resolution works in two steps:

1. **Exact match**: if any tag on the note equals `#<key>` exactly, the placeholder becomes that tag without the `#`.
2. **Prefix match**: otherwise, find all tags that equal `#<key>` or start with `#<key>/`. The **longest** (most specific) match is used, stripped of `#`.

**If no tag matches**, the placeholder becomes an empty string.

**Examples:**

| Note's tags             | Template          | Resolves to                                  |
| ----------------------- | ----------------- | -------------------------------------------- |
| `#tasks/personal`       | `{{tag.tasks}}`   | `tasks/personal` (prefix match, longest tag) |
| `#work`, `#work/design` | `{{tag.work}}`    | `work/design` (longest match)                |
| `#inbox`                | `{{tag.tasks}}`   | `` (empty — no match)                        |
| `#project/alpha`        | `{{tag.project}}` | `project/alpha`                              |

---

## Combining static and dynamic segments

You can freely mix literal segments and placeholders:

```
Archive/{{property.year}}/{{property.project}}
```

If `year: 2025` and `project: Atlas`, this resolves to `Archive/2025/Atlas`.

If `year` is missing, you get `Archive//Atlas` — a valid path with an empty segment. To avoid this, add a trigger condition that requires the property to have a value:

- Trigger: `properties` → `year` (text) → `has any value`

This ensures the rule only matches (and only moves) notes where `year` is set.

---

## Multiple placeholders for nested organization

```
{{property.year}}/{{property.client}}/{{property.project}}
```

This creates a three-level hierarchy purely from frontmatter. Notes with matching properties are filed exactly where they belong. Notes with any missing property resolve to a path with empty segments — consider gating the rule with `has any value` triggers for each property.

---

## When the destination resolves to empty

If a rendered destination is empty or whitespace, the note is **not moved**. No error is shown; the note is simply skipped. This is intentional — it prevents notes with missing metadata from being dropped at the vault root.

---

## Templates and rule matching

Templates are applied **after** a rule matches. They do not affect _which_ rule wins — they only compute the final folder path. This means you can have a rule with a broad trigger (e.g. `tag includes item #client`) and a narrow template (using `{{property.client}}`). Every note with that tag is caught by the rule; the property value determines exactly where it lands.

---

## See also

- [Rules and triggers](rules-and-triggers.md) — how rules match before templates are applied
- [Criteria and operators](criteria-and-operators.md) — using `has any value` to gate on properties
