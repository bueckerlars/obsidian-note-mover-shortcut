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

`main.js` is gitignored, so commit `4a64acc` (parent of the first roadmap commit `419a9b8`) has no `main.js` blob. The baseline number is a production build of that commit (`npm ci && npm run build` in a detached worktree): 250542 bytes. `styles.css` in that commit is 64862 bytes, and rebuilding it produced the same count.

Current production build, measured 2026-11-21 after the German catalog landed: `main.js` 296729 bytes, `styles.css` 59165 bytes.

`styles.css` is smaller than the baseline by 5697 bytes. `main.js` is 46187 bytes over the baseline, 18.4 percent. The gate allows 5 percent (263069 bytes). The extra weight is the English and German catalogs plus the phase 1–9 behavior in the minified bundle. Live code was not deleted to chase the cap.
