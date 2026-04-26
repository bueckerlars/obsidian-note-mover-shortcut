# Destination templates

Destination strings live in each rule’s `destination` field. If the string contains `{{`, the plugin parses **placeholders** and substitutes them using the note’s **tags** and **frontmatter properties** at move time.

Implementation: `src/domain/templates/DestinationTemplate.ts` (`parseDestinationTemplate`, `renderDestinationTemplate`, `validateDestinationTemplate`).

## Syntax

- Placeholders are wrapped in double braces: `{{ ... }}`.
- Inner format must be **`tag.<...>`** or **`property.<...>`**, with a **dot** after the prefix.
- Arbitrary literal text may appear before, between, or after placeholders (static path segments).

### Valid examples

- `Projects/{{property.client}}/Notes`
- `Areas/{{tag.work/personal}}`
- `Inbox/{{property.status}}`

### Invalid examples (parse error)

- Unclosed `{{` without `}}`
- Empty `{{}}`
- Missing key after prefix: `{{tag}}`
- Unknown prefix (only `tag` and `property` are allowed)

On **parse failure** during render, `RuleManagerV2` **falls back to the raw destination string** (safe fallback). The template validator marks such strings invalid for UI/import flows that call `validateDestinationTemplate`.

## `{{tag.<key>}}`

**Resolution** (`resolveTagPlaceholder`):

1. Build a normalized tag to look for: if `<key>` does not start with `#`, it is treated as `#` + key (lowercase).
2. **Exact match:** if some file tag equals that string (case-insensitive), the placeholder becomes that tag **without** the leading `#`.
3. **Prefix match:** otherwise, consider tags that equal the normalized key **or** start with `normalizedKey + '/'`. If any exist, pick the **longest** tag string (most specific), strip `#`, and use that as the segment.

**If nothing matches**, the placeholder becomes an **empty string** (the path may collapse to something with `//` or trailing gaps — still a string; if the **entire** destination becomes empty/whitespace after render, the move is skipped).

**Example** (from unit tests): tags `['#tasks/personal']`, template `P/{{property.status}}/{{tag.tasks}}` with `status: Done` → contains `Done` and `tasks/personal`.

## `{{property.<key>}}`

**Resolution** (`resolvePropertyPlaceholder`):

- Looks up `properties[key]` from frontmatter.
- Missing key → empty string.
- `null` / `undefined` → empty string.
- **String** → used as-is.
- **Array** → `join(', ')` with comma + space.
- Other types → `String(value)`.

## Combining static and dynamic segments

You can mix literals and placeholders:

`Archive/{{property.year}}/{{property.project}}`

If `year` is empty, you may get `Archive//...` — consider fixing frontmatter or using a rule that only matches when properties exist.

## Interaction with rules

Templates are applied **after** a rule matches. They do not affect **which** rule wins; they only compute the folder path for that rule’s destination.

## See also

- [Rules and triggers](rules-and-triggers.md)
- [Criteria and operators](criteria-and-operators.md) — `properties` triggers for gating on frontmatter before moving
