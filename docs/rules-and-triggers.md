# Rules and triggers

A **rule** is a named set of conditions that, when matched, routes a note to a specified destination folder. Rules are evaluated in order — the first active rule that matches wins.

---

## Rule structure

Each rule has these fields:

| Field         | Description                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `name`        | Display name. Shown in previews, history, and the settings UI.                                  |
| `destination` | Target folder path (vault-relative). Can contain `{{tag.…}}` and `{{property.…}}` placeholders. |
| `aggregation` | How multiple triggers combine: `all`, `any`, or `none`.                                         |
| `triggers`    | A list of trigger conditions (what to match on).                                                |
| `active`      | Toggle. If off, the rule is completely skipped.                                                 |

---

## Triggers

Each trigger specifies **what** to test on a note:

| Field          | Description                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `criteriaType` | What to test: `tag`, `fileName`, `folder`, `extension`, `links`, `embeds`, `headings`, `properties`, `created_at`, `modified_at` |
| `operator`     | How to compare: `includes item`, `contains`, `is before`, etc.                                                                   |
| `value`        | The comparison value: a tag string, folder name, date, number, regex, etc.                                                       |
| `propertyName` | Required when `criteriaType` is `properties`. The frontmatter key to look up.                                                    |
| `propertyType` | Required for `properties`: `text`, `number`, `checkbox`, `date`, or `list`. Selects the operator family.                         |

For a full list of criteria types and all available operators, see [Criteria and operators](criteria-and-operators.md).

---

## Aggregation

When a rule has multiple triggers, `aggregation` controls how they combine:

| Value  | Rule matches when            |
| ------ | ---------------------------- |
| `all`  | Every trigger is true        |
| `any`  | At least one trigger is true |
| `none` | Every trigger is false       |

A rule with **zero triggers** is skipped regardless of aggregation.

**Example — combine a tag condition AND a property condition:**

- Aggregation: `all`
- Trigger 1: `tag` → `includes item` → `#project`
- Trigger 2: `properties` → `status` (text) → `is` → `active`

Both must be true for the rule to match.

**Example — match any of several tags:**

- Aggregation: `any`
- Trigger 1: `tag` → `includes item` → `#work`
- Trigger 2: `tag` → `includes item` → `#project`

A note with either tag (or both) matches.

---

## Evaluation order

When a move runs, each note is processed like this:

1. **Blacklist**: if any filter line matches, the note is excluded — see [Blacklist filters](blacklist-filters.md).
2. **Rules list**: rules are checked from top to bottom.
3. Rules marked **inactive** are skipped.
4. Rules with **no triggers** are skipped.
5. The first active rule whose triggers satisfy the aggregation condition **wins**.
6. The rule's **destination** is resolved. If the resolved path is empty (e.g. a required placeholder has no value), the note is not moved.
7. If the note is already in the destination folder, it is not moved.

**Order matters.** Put more specific rules above more general ones. For example, a rule matching `#project/archived` should come before a rule matching `#project`.

---

## What metadata is available for matching

The plugin builds a metadata snapshot for each note before evaluating rules:

| Field        | Source                                              |
| ------------ | --------------------------------------------------- |
| `fileName`   | File name including extension (e.g. `My Note.md`)   |
| `filePath`   | Full vault-relative path                            |
| `tags`       | All tags from Obsidian's tag index                  |
| `properties` | Frontmatter key-value pairs from the metadata cache |
| `createdAt`  | File creation time (from OS file stats)             |
| `updatedAt`  | File modification time                              |
| `extension`  | File extension without dot (e.g. `md`)              |
| `links`      | Outgoing wiki-link targets (`[[…]]`)                |
| `embeds`     | Embedded file targets (`![[…]]`)                    |
| `headings`   | Heading text strings from the metadata cache        |

Rule evaluation does **not** read the full file body unless a blacklist `content:` filter requires it.

---

## Practical examples

### Route inbox notes by tag

A simple rule to collect all notes tagged `#inbox` into one folder:

| Field       | Value                              |
| ----------- | ---------------------------------- |
| Name        | `Inbox`                            |
| Trigger     | `tag` → `includes item` → `#inbox` |
| Aggregation | `any`                              |
| Destination | `Inbox`                            |

### Route to a dynamic client folder

Use a property placeholder so notes go into per-client subfolders automatically:

| Field       | Value                                            |
| ----------- | ------------------------------------------------ |
| Name        | `Client notes`                                   |
| Trigger     | `properties` → `client` (text) → `has any value` |
| Aggregation | `all`                                            |
| Destination | `Clients/{{property.client}}/Notes`              |

A note with `client: Acme` frontmatter goes to `Clients/Acme/Notes`. A note missing the property is not moved (the destination would be empty).

### Route active projects only

Match on two conditions: a tag AND a property value:

| Field       | Value                                            |
| ----------- | ------------------------------------------------ |
| Name        | `Active projects`                                |
| Aggregation | `all`                                            |
| Trigger 1   | `tag` → `includes item` → `#project`             |
| Trigger 2   | `properties` → `status` (text) → `is` → `active` |
| Destination | `Projects/Active`                                |

### Archive old notes

Move notes that haven't been modified in over 90 days to an archive:

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| Name        | `Archive old notes`                         |
| Trigger     | `modified_at` → `is over X days ago` → `90` |
| Aggregation | `any`                                       |
| Destination | `Archive`                                   |

### Notes linking to a specific MOC

Route notes that link to your "Projects MOC" to the Projects folder:

| Field       | Value                                      |
| ----------- | ------------------------------------------ |
| Name        | `Projects MOC links`                       |
| Trigger     | `links` → `includes item` → `Projects MOC` |
| Aggregation | `any`                                      |
| Destination | `Projects`                                 |

### Move canvas files to a dedicated folder

By extension (all canvases):

| Field       | Value                         |
| ----------- | ----------------------------- |
| Name        | `Canvas files`                |
| Trigger     | `extension` → `is` → `canvas` |
| Aggregation | `any`                         |
| Destination | `Canvases`                    |

By tag on a **text card** you created on the canvas (the `.canvas` file is moved, not the card alone):

| Field       | Value                              |
| ----------- | ---------------------------------- |
| Name        | `Inbox canvases`                   |
| Trigger     | `tag` → `includes item` → `#inbox` |
| Aggregation | `any`                              |
| Destination | `Canvases/Inbox`                   |

---

## See also

- [Criteria and operators](criteria-and-operators.md) — full operator lists and edge cases
- [Destination templates](destination-templates.md) — dynamic folder paths
- [Blacklist filters](blacklist-filters.md) — excluding notes before rules run
