---
name: amend
description: Correct a commit on a topic branch so it is true to its one step, the latest or an older one, and force-push it when it was already pushed. Use when asked to amend, fix up or squash a commit, or to fix a typo, a missing file or a wrong message in one.
argument-hint: "[<commit>] [<what to fix>]"
allowed-tools:
  - Bash(git status:*)
  - Bash(git diff:*)
  - Bash(git add:*)
  - Bash(git commit:*)
  - Bash(git log:*)
  - Bash(git branch:*)
  - Bash(git config:*)
  - Bash(git merge-base:*)
  - Bash(git rebase:*)
  - Bash(git rev-parse:*)
  - Bash(git rev-list:*)
  - Bash(git fetch:*)
  - Bash(git push:*)
  - Bash(git worktree:*)
  - Skill
  - Read
---

# Amend

First check the policy switch as `${CLAUDE_PLUGIN_ROOT}/skills/git/SKILL.md` says (outside Claude
Code, `../git/SKILL.md`). When it is off, act as plain git: do what was asked with none of this
plugin's policy.

Change an existing commit so it does what its message says, as one step.

## When to amend

Amend only to make a commit true to its one step:

- a typo, a leftover debug line, a file left out, a formatting failure, a wrong message;
- code that does not deliver the behavior the commit claims;
- two commits that are one step: a test apart from its code, a tool apart from its config, related
  docs split in two;
- a rename or reword that fixes a wrong name or message.

A hand edit by the owner follows the same rules.

## When not to amend

- A commit `main` holds is never amended. A new commit corrects it.
- A new behavior or a refactor gets its own commit through `/commit`, even when review feedback
  prompted it.
- A clearer name for a name that was already correct is a refactor, so it is a new commit.

## Steps

1. The commit to fix: the one given (a SHA or a unique prefix, resolved with
   `git rev-parse --verify <commit>^{commit}`), else the one the fix belongs to. Not on this branch
   (`git merge-base --is-ancestor <sha> HEAD` fails): stop and say so.
1. `git fetch origin`. If `git merge-base --is-ancestor <sha> origin/main` succeeds, `main` holds
   the commit: refuse, say a new commit through `/commit` corrects it, and stop without changing
   anything.
1. Pushed already? When `origin/<branch>` exists and
   `git rev-list --count <branch>..origin/<branch>` is not 0, the remote holds commits this branch
   lacks: skip, and report it.
1. Fix the latest commit, when `<sha>` is `HEAD`:
   - outside omp: `git add <path>...`, then `git commit --amend --no-edit`, or
     `git commit --amend -m "<subject>"` when the message was wrong;
   - in omp, with its eval `commit` tool, when this session made that commit:
     `d = await commit.draft()`, select the fix, `await d.commit("<subject>", amend=True)`;
   - in omp, when this session did not make it: the older-commit route below.
1. Fix an older commit, any other `<sha>`:
   1. Commit the fix as `git commit --fixup <sha>`; in omp,
      `await d.commit("fixup! <original subject>")`.
   1. Find the base: `git config branch.<name>.base`, else `origin/main`.
   1. Anything left in `git status --short`: stop and list it. Never use `--autostash`.
   1. `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash $(git merge-base HEAD <base>)`.
1. Run the tests every commit's policy level asks for (see
   `${CLAUDE_PLUGIN_ROOT}/skills/commit/references/commit-policy.md`, outside Claude Code
   `../commit/references/commit-policy.md`), after the rebase has finished and never inside it.
   A failure: report it and stop before pushing.
1. Pushed branch: `git push --force-with-lease --force-if-includes`, without asking.
1. Report the rewritten commits' short SHAs and subjects, and whether the branch was pushed.

## Safeguards

- No trailers and no "written by" lines in a rewritten message.
- Never `--no-verify`, never `--force` without the lease, never on `main`.
- A rebase that stops on a conflict: `git rebase --abort`, report the files, stop.
- Bail when a rebase, merge or cherry-pick is already in progress, and say which.
