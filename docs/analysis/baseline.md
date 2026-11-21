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

No lint findings at this commit.

## Smoke

Obsidian binary found at `/Applications/Obsidian.app/Contents/MacOS/Obsidian`.

`node scripts/ui-smoke.mjs` on 2026-11-21 exited 0 and saved 30 PNGs under `docs/analysis/screenshots/phase-0/`. That is 15 screens at desktop 1400x1100 and mobile 390x844. This run does not check the DOM assertions. Those land with the assertion functions.
