# Baseline

Recorded on 2026-11-21 at commit `4a64acc` on branch `feat/roadmap-findings`. Node.js v26.13.1. Commands ran from the plugin root.

## Commands

| Command              | Exit | Result                                                                                 |
| -------------------- | ---- | -------------------------------------------------------------------------------------- |
| `npm run lint`       | 0    | ESLint reported no problems.                                                           |
| `npm run type-check` | 0    | `tsc --noEmit` reported no errors.                                                     |
| `npm test`           | 0    | Vitest 4.1.11 passed 181 tests in 29 files.                                            |
| `npm run build`      | 0    | Changelog generation, `tsc -noEmit -skipLibCheck`, and the production bundle finished. |

## Test count

181 tests in 29 files.

## Lint debt

`eslint-plugin-obsidianmd` is `^0.6.0`. The obsidian-sample-plugin template declares `^0.4.0`. `npm run lint` exits 0. One warning is new and stays enabled:

- `src/application/co-move-attachments-on-note-move.ts:44` `obsidianmd/no-tfile-tfolder-cast`. Avoid casting to `TFile`. Use an `instanceof TFile` check.

## Dead code check

`npm run check:dead` runs knip for TypeScript and currently exits 1 on existing unused files, dependencies, and exports. CSS dead-code check is phase 2.

## Smoke

Obsidian binary found at `/Applications/Obsidian.app/Contents/MacOS/Obsidian`.

`node scripts/ui-smoke.mjs` on 2026-11-21 exited 0 and saved 30 PNGs under `docs/analysis/screenshots/phase-0/`. That is 15 screens at desktop 1400x1100 and mobile 390x844.

The same command wrote `docs/analysis/baseline-smoke.json`. The phase 2 run exited 0, opened all 30 screens, and recorded 456 assertion failures: 90 touch, 342 missing `aria-label`, 22 inline `style`, and 2 console errors from `renderMarkdown`. All 90 touch failures are on mobile screens. Desktop touch passed. Modal title and horizontal overflow did not fail.

`npm run ui:smoke -- docs/analysis/screenshots/phase-N` writes that directory. `SMOKE_OUT` sets the same path.
No argument leaves committed `phase-0` files in place. `--baseline` is the request that writes `phase-0`.

## Phase 2 CSS size

`styles.css` is 2433 lines. Deleting unused classes removed 465 lines from a 2909-line file. The rest of phase 2 replaced values in place and added the device-class scopes, the `100dvh` fallback, and the title variables. `10px` spacing stays because the size scale has no 10px step. Live rules were not deleted to reach 2300.

## Phase 7 axe

`npm run ui:smoke -- docs/analysis/screenshots/phase-7` on 2026-11-21. Plugin-owned serious and critical nodes are 0 on every screen. The raw `smoke.json` still lists chrome violations. Do not treat the run as axe-clean.

Chrome that remains: `color-contrast` on `.vertical-tab-header-group-title` (Optionen, Obsidian-Erweiterungen, Externe Erweiterungen). Those nodes sit in the settings tab list, outside `.advancedNoteMover-settings-root`. Desktop settings screens report 3 serious. Mobile settings hide that list, so they report 0.

The smoke Tab walk moved focus once and did not close the dialog. Settings itself is a modal, so Escape there is not a plugin dialog check. `src/modals/modalFocus.test.ts` focuses the first field and restores focus on Escape. The smoke did not walk every control.

## Bundle size

`main.js` is gitignored. Commit `4a64acc` has no `main.js` blob. The baseline is a production build of that commit.

Rebuild on 2026-11-21 with esbuild 0.25.12. The command is `npm run build`, which runs `node esbuild.config.mjs production`. In that mode `minify` is true and `sourcemap` is false. The rebuilt baseline `main.js` is 250542 bytes. `styles.css` at that commit is 64862 bytes, and the rebuild wrote the same count. The file has no `sourceMappingURL`.

The same command on the tree before the catalog read writes `main.js` at 296729 bytes and `styles.css` at 59165 bytes. A second production esbuild with `metafile: true` wrote 296729 bytes again. The cap is 263069 bytes, baseline plus 5 percent. `main.js` is 33660 bytes over the cap and 46187 bytes over the baseline. `styles.css` is 5697 bytes under the baseline. The phase 10 size gate was open at that build.

esbuild `bytesInOutput` on the two metafiles sums to the 46187 byte gap. Each bundle has the same 573 bytes outside any input, so that wrapper is not the growth.

| Input                        | Baseline | Current |  Delta |
| ---------------------------- | -------: | ------: | -----: |
| `virtual:languages`          |        0 |   39646 | +39646 |
| `src/generated/changelog.ts` |    27956 |   34390 |  +6434 |
| Every other input            |   222013 |  222120 |   +107 |
| esbuild wrapper              |      573 |     573 |     +0 |
| `main.js`                    |   250542 |  296729 | +46187 |

The language module is one copy of compact JSON. A production bundle that contains only `languages/en.json` puts 18538 bytes in that module. Only `languages/de.json` puts 21117 bytes in it. Those two sizes sum to 39655. The shipping module is 39646 bytes because the wrapper is counted once. Pretty `languages/en.json` plus `languages/de.json` is 45625 bytes, larger than the module.

`src/generated/changelog.ts` grew by the 1.4.0 notes. The sentence "Settings, modal, command, and notice copy is read from" appears once in `main.js`.

28 new source files add 21837 bytes. The net change in existing modules, apart from the changelog, is a 21730 byte decrease. Together that is +107 bytes. The largest new file is `src/settings/AdvancedNoteMoverSettingsTab.ts` at 2699 bytes. It replaces `src/settings/Settings.ts`, which was 3734 bytes in the baseline bundle.

A production bundle with only the English catalog is 275621 bytes, still 12552 bytes over the cap. The German catalog is live copy on top of that.

The production bundle has no second language module, no source map, and no test or dev input. `charset: 'utf8'` would save 514 bytes. The baseline build uses the default `ascii` charset. 514 bytes still leaves `main.js` over the cap, so the esbuild config is unchanged. At this measurement, catalogs, changelog entries, and feature source stay in the bundle.

## Bundle size after the catalog read

`npm run build` on 2026-11-21 writes `main.js` at 258252 bytes. The same command a second time writes 258252 bytes. Both files have no `sourceMappingURL`. The baseline is 250542 bytes. The cap is 263069 bytes. The size before this build is 296729 bytes. 258252 is 4817 bytes under the cap and 17710 bytes over the baseline. The phase 10 size gate passes.

The drop from 296729 to 258252 is 38477 bytes. The inlined `virtual:languages` module in the table above is 39646 bytes. `main.js` contains no `Unbenannte Regel` and no `languages/de.json`, so that module is gone. `configDir` is present in the loader. The changelog sentence "Settings, modal, command, and notice copy is read from" still appears once. The language module cannot be removed a second time. The remaining bytes are the changelog and the other inputs in the table above, plus the loader that replaced the language module.
