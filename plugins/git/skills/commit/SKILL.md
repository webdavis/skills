---
name: commit
description: Make one commit for one step of work, checked against the repository's commit policy, and set that policy with --policy. Use when asked to commit changes, or to choose how strictly a repository or folder is tested before commits (tdd, guard, off). Never pushes.
argument-hint: "[--policy [tdd|guard|off] [<folder>]]"
disable-model-invocation: true
allowed-tools:
  - Bash(git config:*)
  - Bash(git status:*)
  - Bash(git diff:*)
  - Bash(git add:*)
  - Bash(git commit:*)
  - Bash(git log:*)
  - Bash(git rev-parse:*)
  - Bash(git worktree:*)
  - Bash(git ls-files:*)
  - Skill
  - Read
  - Edit
  - Write
---

# Commit

First check the policy switch as `${CLAUDE_PLUGIN_ROOT}/skills/git/SKILL.md` says (outside Claude
Code, `../git/SKILL.md`). When it is off, act as plain git: do what was asked with none of this
plugin's policy.

Make one commit from the current changes. The repository's commit policy decides which tests must
pass first; read `${CLAUDE_PLUGIN_ROOT}/skills/commit/references/commit-policy.md` (outside Claude
Code, `references/commit-policy.md` beside this skill) before committing.

## How a commit is made

- In omp, when its eval `commit` tool exists: `d = await commit.draft()`, select the step's lines
  (`take`, `only`, `drop`), then `await d.commit("<subject>")`. In omp never use `git stash`,
  `git reset`, `git restore`, `git checkout -- <path>`, `git add` or `git commit` outside a rebase
  or merge in progress.
- Elsewhere: `git add <path>...` by name, then `git commit -m "<subject>"`.

## Steps

1. Run `git status --short` and `git diff --stat` to see the pending changes.
1. One step per commit. When the changes hold more than one step, list them, commit the first, and
   leave the rest for further commits. A test and the code it checks are one step.
1. Stage the step's files by name. Never `git add -A` or `git add .`.
1. Find the level for the staged paths in `.agents/commit-policy` and run its check: the `tdd`
   check for `tdd`, the tests for `guard`, nothing for `off`. A failed check: stop and report it.
1. Write the message. With Conventional Commits on, follow
   `${CLAUDE_PLUGIN_ROOT}/skills/conventional-commits/SKILL.md` (outside Claude Code,
   `../conventional-commits/SKILL.md`); with it off, a plain imperative subject. Add a body only
   when it tells something the subject does not, and keep it short.
1. Commit, then report the short SHA and the subject.

## `--policy`

Each form edits `.agents/commit-policy` and commits only that file, never other work.

- `/commit --policy tdd|guard|off`: replace the existing `*  <level>` line in place, or insert it
  as the first rule line, keeping the folder lines below it.
- `/commit --policy <level> <folder>`: write `<folder>/**  <level>`, replacing that folder's line
  or appending it at the end.
- `/commit --policy` alone: look at the repository (its folders, which have tests, what each holds)
  and suggest a level per folder with a one-line reason each. Write the file only once the owner
  agrees.

## Safeguards

- No trailers: no `Co-Authored-By`, no "Generated with" or "written by" line. The commit reads as
  the owner's own work.
- Never `--no-verify`. If a hook fails, show its output and stop.
- Only adds commits: never amends, resets, rebases or pushes.
- Nothing to commit: report it and stop.
