#!/usr/bin/env bash
# Ship committed work: push it and merge it into main on GitHub right away.
# On main: push. On any other branch: push, open a PR (unless one exists), merge it
# with a merge commit, delete the branch on both sides and return to an up-to-date main.
# Usage: npm run ship  (or ./tools/ship.sh "PR title")
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
for tool in git gh; do
	command -v "$tool" >/dev/null || {
		echo "Missing prerequisite: $tool" >&2
		exit 1
	}
done
if [[ -n "$(git status --porcelain)" ]]; then
	echo "Uncommitted changes: commit them first (only commits are shipped)." >&2
	exit 1
fi

branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
	echo "Detached HEAD: switch to a branch first." >&2
	exit 1
fi

if [[ "$branch" == main ]]; then
	git pull --rebase origin main
	git push origin main
	exit 0
fi

git push -u origin "$branch"
if ! gh pr view "$branch" --json state --jq .state 2>/dev/null | grep -qx OPEN; then
	title="${1:-$(git log -1 --format=%s)}"
	gh pr create --base main --head "$branch" --title "$title" --fill-verbose
fi
gh pr merge "$branch" --merge --delete-branch
git switch main
git pull --ff-only origin main
git fetch --prune origin
