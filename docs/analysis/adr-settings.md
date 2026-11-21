# Settings tab source of truth

## Status

Accepted. `minAppVersion` stays `1.8.7`.

## Context

The settings tab is built twice. `src/settings/sections/` draws it with `Setting` for Obsidian 1.8.7 and later. `getSettingDefinitions()` in `src/settings/Settings.ts` draws the same settings again for Obsidian 1.13. The two copies already disagree on labels.

`manifest.json` sets `minAppVersion` to `1.8.7`. In `node_modules/obsidian/obsidian.d.ts`, `SettingGroup` is marked `@since 1.11.0`. `Setting.setHeading()` is marked `@since 0.9.16`. `getSettingDefinitions()` is marked `@since 1.13.0`.

## Decision

One list in `src/settings/settingDefinitions.ts` is the source of truth. Each entry has an id, a section id, a `languages/en.json` key for the name, an optional description key, and a control kind. Files in `src/settings/sections/` render that list. They read names and descriptions through those keys. They do not keep a second copy of the same setting.

Headings use `Setting.setHeading()`. The tab does not call `SettingGroup`, and it does not raise `minAppVersion` to reach that class.

`getSettingDefinitions()` returns an empty array. Obsidian calls `display()` when that array is empty, so the sections stay the only renderer. The empty method keeps the settings tab on Obsidian 1.13 and satisfies the lint rule that looks for the method. It does not describe settings, so settings search on 1.13 does not list them.

## Consequences

A setting name or control kind changes in the list, and every section that renders that id follows the list. A new `languages/<code>.json` file is selected by its filename. It does not need a new import.

The visible tab no longer depends on an API newer than 1.8.7. Users on Obsidian 1.13 lose this plugin's settings in the settings search until the minimum app version can rise.
