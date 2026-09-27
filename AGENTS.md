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
  (type check, content/audio validation, bundle); `npm run sim` for battle/AI changes.
  CI (`.github/workflows/ci.yml`) re-runs them on `main`, and Vercel deploys `main`.

## Project notes

- Node 22 (`.nvmrc`, Vercel's version). Scripts and test commands: `README.md`.
- Audit history and known follow-ups: `docs/REPO_AUDIT.md`; browser matrix: `docs/COMPATIBILITY.md`.
