# Rules and triggers (Rule V2)

## Rule object

Each rule in `rulesV2` has this shape (see `src/types/RuleV2.ts`):

| Field         | Meaning                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `name`        | Display name; also used in previews when a rule matches.                                        |
| `destination` | Target **folder** path (vault-relative), optionally containing template placeholders `{{...}}`. |
| `aggregation` | How multiple triggers combine: `all`, `any`, or `none`.                                         |
| `triggers`    | List of **trigger** objects (criteria + operator + value).                                      |
| `active`      | If `false`, the rule is skipped entirely.                                                       |

## Trigger object

Each trigger specifies **what** to test:

| Field          | Meaning                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `criteriaType` | One of: `tag`, `fileName`, `folder`, `extension`, `links`, `embeds`, `properties`, `headings`, `created_at`, `modified_at`. |
| `operator`     | Operator allowed for that criteria (see [Criteria and operators](criteria-and-operators.md)).                               |
| `value`        | Operand string (pattern, date text, count, regex pattern, etc.).                                                            |
| `propertyName` | Required when `criteriaType` is `properties`.                                                                               |
| `propertyType` | For `properties`: `text`, `number`, `checkbox`, `date`, or `list` — selects which operator family applies.                  |

## Evaluation order

1. **Blacklist** (if not skipped): if any filter line matches, the file is excluded — see [Blacklist filters](blacklist-filters.md).
2. **Rules list**: rules are scanned **from first to last**. The **first active** rule that satisfies its triggers is used.
3. Rules with **`active: false`** are skipped.
4. Rules with **no triggers** are skipped.
5. **Destination** is resolved (plain path or [template](destination-templates.md)). An **empty** resolved destination is treated as **no valid target** — the file is not moved.

## Aggregation (`all` / `any` / `none`)

For each rule, every trigger is evaluated to `true` or `false`. Then:

| `aggregation` | Rule matches when               |
| ------------- | ------------------------------- |
| `all`         | Every trigger is `true`.        |
| `any`         | At least one trigger is `true`. |
| `none`        | Every trigger is `false`.       |

If there are zero triggers, the rule does not match (aggregation is not applied to an empty list in a useful way — the rule is skipped).

## Metadata used for matching

Matching uses `FileMetadata` built by `MetadataExtractor.extractFileMetadataV2` (`src/core/MetadataExtractor.ts`):

| Field                     | Source (simplified)                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `fileName`                | File name including extension.                                                                              |
| `filePath`                | Full vault path.                                                                                            |
| `tags`                    | From Obsidian’s tag index (`getAllTags`).                                                                   |
| `properties`              | Frontmatter object from the metadata cache.                                                                 |
| `createdAt` / `updatedAt` | From file stats (`ctime` / `mtime`).                                                                        |
| `extension`               | Obsidian file extension (e.g. `md`).                                                                        |
| `links`                   | Outgoing wiki-link targets from the metadata cache (`[[...]]` link field).                                  |
| `embeds`                  | Embedded note targets (`![[...]]`).                                                                         |
| `headings`                | Heading text strings from the metadata cache.                                                               |
| `fileContent`             | Only read when needed for **blacklist** `content:` filters (see [Blacklist filters](blacklist-filters.md)). |

Rule evaluation itself does **not** require reading the full file body unless filters require it.

## Practical scenarios

### Scenario: “Inbox” routing by tag

- **Trigger**: `criteriaType: tag`, operator `includes item`, value `#inbox` (tags are compared case-insensitively; see engine).
- **Destination**: `Inbox` or a template such as `Areas/{{property.area}}`.

### Scenario: combine tag + property

- **Aggregation**: `all`
- **Triggers**: (1) tag `includes item` `#project`, (2) `properties` with `propertyName: status`, `propertyType: text`, operator `contains`, value `active`.

### Scenario: exclude weekends (modified date)

- **Trigger**: `modified_at` with a day-of-week operator (see [Criteria and operators](criteria-and-operators.md)).

### Scenario: notes linking to a MOC

- **Trigger**: `links` with `includes item` or list operators to require certain link targets.

## See also

- [Criteria and operators](criteria-and-operators.md) — full operator lists and edge cases.
- [Destination templates](destination-templates.md) — dynamic folders.
- [Commands, triggers, and internals](commands-triggers-internals.md) — caching and when rules re-run.
