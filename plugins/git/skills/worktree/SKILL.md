---
name: worktree
description: Make, list, delete and catch up git worktrees, one per branch, each remembering the branch it was built on. Use to start work on a branch in its own worktree, see which worktrees are merged or behind, remove one, or rebase worktrees onto their updated or merged base.
argument-hint: "[<name> | list | delete <name> [--branch] [--remote] | catchup [<name>] [--with <branch>]]"
allowed-tools:
  - Bash(git status:*)
  - Bash(git log:*)
  - Bash(git fetch:*)
  - Bash(git branch:*)
  - Bash(git config:*)
  - Bash(git worktree:*)
  - Bash(git rev-parse:*)
  - Bash(git rev-list:*)
  - Bash(git merge-base:*)
  - Bash(git rebase:*)
  - Bash(git checkout:*)
  - Bash(git push:*)
  - Bash(git ls-remote:*)
  - Bash(wt:*)
  - Bash(npx -y gh-axi:*)
  - Bash(gh pr:*)
  - Read
---

# Worktree

One worktree per branch. Each branch remembers what it was built on in its git config:
`branch.<name>.base` is the base branch and `branch.<name>.baseTip` the base's commit when the branch
was last built on it.

Use `wt` when `command -v wt` succeeds, otherwise the plain git commands given. GitHub calls use
`npx -y gh-axi` when `npx` exists, otherwise `gh`; without `gh`, stop and say `gh` is needed.

`list`, `delete` and `catchup` are keywords. A keyword always wins over a branch of the same name;
when such a branch exists, say so, since `/worktree <name>` cannot reach it.

## `/worktree <name>`

1. The branch exists locally or on GitHub (`git ls-remote --heads origin <name>`): make a worktree
   for it, `wt switch <name> --no-cd` or `git worktree add <path> <name>`. Record `base` as
   `origin/main` unless one is set, and `baseTip` as `git merge-base <name> origin/main`.
1. Otherwise: `git fetch origin`, then a new branch from `origin/main`:
   `wt switch --create <name> --base origin/main --no-cd`, or
   `git worktree add -b <name> <path> origin/main`. Record `base` as `origin/main` and `baseTip` as
   `git rev-parse origin/main`.
1. Recording is `git config branch.<name>.base <base>` and `git config branch.<name>.baseTip <sha>`.
1. Report which happened and the worktree's path.

## `/worktree list`

Every worktree (`wt list` or `git worktree list`) with its branch and state:

- merged: its pull request is merged, or `git merge-base --is-ancestor <name> origin/main`;
- behind its base: `git rev-list --count <name>..<base>` commits;
- work not committed: `git -C <path> status --short` is not empty.

## `/worktree delete <name> [--branch] [--remote]`

- No flag removes the worktree only: `wt remove --no-delete-branch <name>` (the owner's Worktrunk
  config deletes branches by default), or `git worktree remove <path>`.
- `--branch` also deletes the local branch (`git branch -D <name>` after the check below).
- `--remote` also deletes the GitHub branch: `git push origin --delete <name>`. Refuse while the
  branch has an open pull request (`gh-axi pr list --head <name>`).
- Both flags delete all three.

Before deleting, check what would be lost: work not committed in the worktree; with `--branch`,
commits on no other branch or remote (`git log <name> --not --remotes --exclude=<name> --branches`);
with `--remote`, commits only GitHub has. When something would be lost, show the confirmation
screen from `${CLAUDE_PLUGIN_ROOT}/skills/clean/SKILL.md` (outside Claude Code,
`../clean/SKILL.md`) and act only on a yes. Otherwise delete without asking.

Other worktrees built on this branch (`branch.<other>.base` is `<name>`): name them and set their
base to `origin/main`. If the deleted branch was not merged, also
`git config --unset branch.<other>.baseTip`, so its commits stay inside the other branch at the next
catch-up, and say so.

## `/worktree catchup [<name>]`

Catches up every worktree, or the one named, from any folder.

1. `git fetch origin`.
1. Take each worktree behind its base (`branch.<name>.base`, else `origin/main`). Bases go first, so
   a branch built on another branch moves after that branch has moved.
1. Skip, untouched, and report: work not committed in the worktree; or `origin/<name>` exists and
   `git rev-list --count <name>..origin/<name>` is not 0.
1. Base merged? For a base other than `origin/main`, ask GitHub:
   `gh-axi pr list --state all --head <base>`, then
   `gh-axi pr view <n> --fields state,mergedAt,headRefOid` (`gh pr view <n> --json ...` without
   gh-axi). Compare the state ignoring case. If merged, the new base is `origin/main` and the cut is
   `baseTip`; with no `baseTip`, the cut is `headRefOid` when
   `git merge-base --is-ancestor <headRefOid> <name>` succeeds. No usable cut: skip and report.
1. `git -C <path> rebase --onto <new base tip> <cut>`. When the base was not merged, the new base
   tip is `git rev-parse <base>` and the cut is `baseTip`, or `git merge-base <name> <base>` when
   none is recorded. On a conflict: `git -C <path> rebase --abort` and report the files.
1. When any path the branch changes is at `guard` or `tdd` in `.agents/commit-policy`, run the
   tests after the rebase has finished, never inside it (see
   `${CLAUDE_PLUGIN_ROOT}/skills/commit/references/commit-policy.md`, outside Claude Code
   `../commit/references/commit-policy.md`). On a failure, put the branch back on its old tip with
   `git -C <path> checkout -B <name> <old tip>` and report it.
1. Record the new `base` and `baseTip`. A branch on GitHub:
   `git -C <path> push --force-with-lease --force-if-includes`.
1. Report one line per worktree, such as "feature-b: caught up with main, 3 commits, PR #12
   updated".

## `/worktree catchup <name> --with <branch>`

Catches `<name>` up with `<branch>` as above and records `<branch>` as its base. Before acting, say
"<name> will change. <branch> is not touched."

Two bare names (`/worktree catchup a b`), or `--with` without a name: refuse and show
`/worktree catchup <name> --with <branch>`.

## Safeguards

- Never `--autostash`, never `--force` without the lease, never touch `main`'s worktree.
- Never run tests inside `git rebase -x` or a git hook.
