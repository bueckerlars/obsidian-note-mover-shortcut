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

The same command wrote `docs/analysis/baseline-smoke.json`. Live smoke ran, all 30 screens opened, and the file records 469 assertion failures. Touch size, missing `aria-label`, and inline `style` on plugin classes fail. Modal title and horizontal overflow did not fail. The update screen also records one console error from `renderMarkdown`.
