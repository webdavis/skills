---
name: clean
description: Find stale git branches and worktrees, local and on GitHub, judge each one, and delete only what the owner confirms. Use when asked to clean up, prune or tidy branches or worktrees, or to remove everything for one branch name. Never runs `git clean`.
argument-hint: "[<name>]"
allowed-tools:
  - Bash(git config:*)
  - Bash(git status:*)
  - Bash(git log:*)
  - Bash(git diff:*)
  - Bash(git fetch:*)
  - Bash(git branch:*)
  - Bash(git worktree:*)
  - Bash(git rev-list:*)
  - Bash(git merge-base:*)
  - Bash(git cherry:*)
  - Bash(git ls-remote:*)
  - Bash(git push:*)
  - Bash(wt:*)
  - Bash(npx -y gh-axi:*)
  - Bash(gh pr:*)
---

# Clean

First check the policy switch as `${CLAUDE_PLUGIN_ROOT}/skills/git/SKILL.md` says (outside Claude
Code, `../git/SKILL.md`). When it is off, act as plain git: do what was asked with none of this
plugin's policy.

Delete branches and worktrees that are no longer needed, and nothing that holds work found nowhere
else unless the owner says yes. This skill never runs `git clean`; files outside git are not its
business.

Use `wt` when `command -v wt` succeeds, otherwise plain git. GitHub calls use `npx -y gh-axi` when
`npx` exists, otherwise `gh`; without `gh`, stop and say `gh` is needed. Compare pull request
states ignoring case.

## `/clean`

1. `git fetch origin --prune`.
1. Gather every local branch (`git branch`), GitHub branch (`git ls-remote --heads origin`) and
   worktree (`wt list` or `git worktree list`). `main` and the current branch are never candidates.
1. Investigate each one as the next section says, and give it a verdict, delete, keep or unsure,
   with a one-line reason. Judge each branch on its own facts; age alone never makes a branch
   stale.
1. Show the confirmation screen once for everything, then delete only after the owner's yes.

## `/clean <name>`

Everything for that name: its worktree, its local branch and its GitHub branch. Investigate the
same way. Before refusing because of commits that are not merged:

- check whether their changes are in `main` anyway, as after a squash merge
  (`git cherry origin/main <name>`, or `git diff <merge-base>..<name>` compared with what `main`
  holds), or in another branch;
- label leftover debug lines or build output in the worktree as safe to lose.

## Investigating one item

- Pull request: `gh-axi pr list --state all --head <branch>`; merged, closed or open.
- Commits found nowhere else: `git log <branch> --not --remotes --exclude=<branch> --branches`.
- Changes already in `main`: as in `/clean <name>`.
- Worktree: work not committed yet (`git -C <path> status --short`) and what it is.
- A branch other worktrees are built on (`git config --get-regexp 'branch\..*\.base'`): keep it, or
  say which worktrees it affects.

## Confirmation screen

List each item with:

- what deleting it means: "3 commits exist nowhere else and will be lost", "safe: changes already
  in main";
- for a branch with an open pull request: "PR #12 will be closed", with the reason, replaced by
  #N or abandoned;
- its verdict and reason.

End with "Delete all of this?" and wait for yes or no. Work that exists nowhere else is never
deleted without that yes. A yes given earlier does not carry over.

On yes, close each listed pull request first (`gh-axi pr close <n> --comment "<reason>"`), so its
GitHub branch can then be deleted.

## Deleting

- Worktree and local branch: `wt remove <branch>`, adding `-D` for an unmerged branch the owner
  confirmed; or `git worktree remove <path>`, then `git branch -d <branch>` (`-D` when confirmed).
- GitHub branch: `git push origin --delete <branch>`. Never while it has an open pull request the
  owner did not agree to close.
- Report each deletion, and anything left with the reason.
