# AGENTS.md — Final Fealty Tactics

Repo rules for every coding agent (Claude Code reads this through `CLAUDE.md`).

## Git workflow: commit → push → merge, every time

- Every commit is pushed to GitHub and merged into `main` straight away. Committing and
  shipping are pre-approved in this repo; don't stop to ask.
- Work on a short-lived branch (or directly on `main` for small fixes), commit, then run
  `npm run ship`. It pushes, opens a PR if needed, merges it with a merge commit, deletes the
  branch locally and on GitHub, and leaves you on an up-to-date `main`.
- Never leave an open PR, an unmerged pushed branch or a stash behind. If you find one, merge
  it (or close it and delete its branch when it is obsolete).
- Before shipping, run the checks that fit the change: `npm test` and `npm run build`
  (type check, content/audio validation, bundle); `npm run sim` for battle/AI changes;
  `npm run hub:check` and `npm run hub:harness` for anything a 52in1 session touches (boot,
  `src/game/session.ts`, Trials, Moments, the head tags). CI (`.github/workflows/ci.yml`)
  re-runs them on `main`. The game's public home is 52in1: `npm run package` builds the
  package 52in1 imports (`tools/hub/README.md`).

## Project notes

- Every line a player sees goes through `t()` with its id in a catalog under `src/i18n/ui/`
  (content stays in `src/data/` and is localized in place). Check new screens with
  `?lang=en-XA`, `?lang=zh-XC` and `?lang=ar-XB` (README, *Languages*).
- Never write a model name into the repository: the credit goes into the packaged page only,
  through `npm run package -- --model … --effort … --harness …` at hand-off.
- Node 22 (`.nvmrc`). Scripts and test commands: `README.md`.
- Audit history and known follow-ups: `docs/REPO_AUDIT.md`; browser matrix: `docs/COMPATIBILITY.md`.
- The 52in1 plan and what it delivered: `docs/PLAN-52IN1.md` (the package, original audio,
  sessions, languages, DualSense); its record is *Pass 4* in `docs/REPO_AUDIT.md`.
