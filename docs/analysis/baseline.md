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
