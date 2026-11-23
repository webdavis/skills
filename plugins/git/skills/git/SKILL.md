---
name: git
description: Load this before starting any work in a git repository, such as editing files, fixing a bug, adding a feature, acting on review feedback, committing or opening a pull request. Holds the owner's rules for worktrees, commits, pull requests and merging, and names the skill that does each step. `/git on`, `/git off` and `/git` set or show whether the rules apply in this repository.
argument-hint: "[on | off]"
allowed-tools:
  - Bash(git config:*)
  - Bash(git remote:*)
  - Bash(gh api:*)
  - Bash(gh repo view:*)
  - Bash(npx -y gh-axi:*)
  - Bash(gh pr:*)
  - Read
---

# Git

The rules to follow before and during any work in a git repository. This is the only skill a model
may start on its own; every other skill in this plugin runs when the owner names it, or when a rule
below says to follow it.

## Policy switch

First decide whether the rules apply in this repository.

1. `git config --local --get webdavis.policy`. `on` or `off`: that is the state, set in
   `.git/config`.
1. Not set: the default is on when the repository's owner is the logged-in GitHub user
   (`gh api user --jq .login`), else off.
   - The repository's owner is the `upstream` remote's owner when that remote exists
     (`git remote get-url upstream`, the `<owner>` in `github.com[:/]<owner>/<repo>`).
   - Otherwise `gh repo view --json isFork,parent,owner`: `parent.owner.login` for a fork, else
     `owner.login`. Never `origin`'s owner alone, since `origin` is often the user's fork.
   - A repository with no GitHub remote counts as the user's: on.

Commands:

- `/git off`: `git config --local webdavis.policy off`.
- `/git on`: `git config --local webdavis.policy on`.
- `/git`: show the state and where it came from: "set in .git/config", or "default: <owner> is (not)
  the logged-in user", or "default: no GitHub remote".

The switch lives in `.git/config` and is never committed. A set switch beats the default.

When the state is off, say "This repository follows its owner's rules" and stop. Every other skill
checks this switch first and, when it is off, acts as plain git with none of the rules below.

## Rules

Each rule keeps one piece of work reviewable on its own and leaves publishing decisions with the
owner.

- Isolate work. Give unrelated work its own worktree on its own branch, made with `worktree` before
  the first edit, never on `main`. A new feature, or a fix to something else, is unrelated work,
  even in the same conversation. This keeps `main` and the owner's own edits untouched and each
  pull request about one thing.
- Put review feedback on a branch that is not merged in that branch's worktree, so the fix lands in
  the pull request it belongs to. When the branch has a pull request, update its title and
  description to cover the feedback once it is committed (`gh-axi pr edit <n> --title ...
  --body-file ...`, or `gh pr edit`), so they still describe what merging does.
- Open, merge or auto-merge a pull request only when the owner asks for it by name. These publish
  work, and finishing a feature is not such a request.
- Commit each step once it is done, through `commit`. `.agents/commit-policy` decides whether the
  commit needs a test.
- Commit, amend, open pull requests and merge only through this plugin's skills, never with raw
  `git commit` or `gh pr` calls of your own. The skills carry the checks raw commands skip: the
  commit policy, no trailers, force-pushes with a lease.

## Skills

The other skills run when the owner types their name, or when a rule above needs one. To follow
one yourself, read its `SKILL.md` in the sibling folder of this skill (`../<name>/SKILL.md` from
this file) and do what it says.

- `worktree`: make, list, delete or catch up a branch's worktree.
- `commit`: one commit per step, checked against the commit policy; `--policy` sets that policy.
- `amend`: correct a commit on a topic branch so it is true to its step.
- `pr`: commit any pending work, then open a pull request.
- `merge`: merge a pull request whose checks passed and remove its worktree.
- `clean`: judge and delete stale branches and worktrees.
- `conventional-commits`: the message format `commit` and `amend` follow.
