---
name: merge
description: Merge the current branch's GitHub pull request once its checks pass, or turn on auto-merge with --auto, then pull main and remove the branch's worktree and GitHub branch. Use when asked to merge or land a pull request, or with --policy to set which merge methods the GitHub repository allows.
argument-hint: "[<pr>] [--keep] [--auto] [--merge|--squash|--rebase] [--policy merge|squash|rebase]"
allowed-tools:
  - Bash(git status:*)
  - Bash(git rev-parse:*)
  - Bash(git ls-remote:*)
  - Bash(git push origin --delete:*)
  - Bash(git worktree:*)
  - Bash(git branch:*)
  - Bash(git pull:*)
  - Bash(wt:*)
  - Bash(npx -y gh-axi:*)
  - Bash(gh pr:*)
  - Bash(gh repo:*)
  - Bash(gh api:*)
---

# Merge

Merge the current branch's pull request, bring `main` up to date and clean up the branch.

GitHub calls use `npx -y gh-axi` when `npx` exists, otherwise `gh`. Without `gh`, stop and say `gh`
is needed. The repository settings below need `gh repo` directly, since gh-axi has no flags for
them. Compare pull request states ignoring case: gh-axi prints `merged`, gh prints `MERGED`.

## Steps

1. Find the pull request: the number given as an argument, else `gh-axi pr list --head <branch>` or
   `gh pr view <branch>`; call its number `<n>`. Already merged (it merged on its own after
   `--auto`): skip the checks and the merge step. Read its checks on GitHub with
   `gh-axi pr checks <n>` or `gh pr checks <n>`; never rerun
   tests here. Any failed: stop and name them. Any still running: stop, except with `--auto`. All
   passed, or none configured: continue.
1. Work not committed yet in the branch's worktree (`git -C <path> status --short`): stop and list
   it.
1. Move to `main`: `wt switch main` when `command -v wt` succeeds, otherwise the main worktree's
   path, the first line of `git worktree list`.
1. Pick the method: the one-PR flag if given, else the one GitHub allows
   (`gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed`); when several
   are allowed, `merge`. Run `gh-axi pr merge <n> --<method>` or `gh pr merge <n> --<method>`, with
   no custom `--subject`.
1. GitHub branch: when `git ls-remote --heads origin <branch>` still prints it, delete it with
   `git push origin --delete <branch>`, unless `--keep`. Report whether it was deleted or already
   gone.
1. `git pull` in `main`.
1. Remove the worktree and local branch: `wt remove <branch>`, or `git worktree remove <path>` and
   `git branch -d <branch>`. After a squash or rebase merge, `git branch -d` refuses because the
   commits differ: confirm the pull request's state is `MERGED`, then force with
   `wt remove -D <branch>` or `git branch -D <branch>`.
1. Check `wt list`, or `git worktree list` and `git branch`, and report anything left and why.

## Flags

- `--keep`: the worktree, local branch and GitHub branch stay. `main` is still pulled.
- `--auto`: turn on auto-merge instead of merging now, so GitHub merges once the required checks
  pass and reviews are in.
  1. GitHub must allow it: `gh api repos/{owner}/{repo} --jq .allow_auto_merge`. False: stop and
     say the repository setting "Allow auto-merge" is off (`gh repo edit --enable-auto-merge`
     turns it on).
  1. Pick the method as in the merge step. A method flag GitHub does not allow: stop, since
     allowing it only for this merge does not work when the merge happens later.
  1. `gh-axi pr merge <n> --auto --<method>` or `gh pr merge <n> --auto --<method>`.
  1. Skip the rest: deleting the GitHub branch, pulling `main` and removing the worktree happen when
     the owner runs `/merge` again after it lands, or `/clean`. Say so.
- `--merge`, `--squash`, `--rebase`: the method for this pull request only. If GitHub does not
  allow it:
  1. Record the three settings from `gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed`.
  1. Allow the method: `gh repo edit --enable-merge-commit`, `--enable-squash-merge` or
     `--enable-rebase-merge`.
  1. Merge.
  1. Restore the recorded settings with
     `gh repo edit --enable-merge-commit=<bool> --enable-squash-merge=<bool> --enable-rebase-merge=<bool>`,
     also when the merge failed.
  1. Report both changes. If restoring failed, say so and give the exact `/merge --policy <method>`
     command that puts it back.
- `--policy merge|squash|rebase`: never merges. Allows exactly that method on GitHub and disables
  the other two, with
  `gh repo edit --enable-merge-commit=<bool> --enable-squash-merge=<bool> --enable-rebase-merge=<bool>`.
  Nothing is written to the repository's files. `--policy` alone shows the current setting.

## Safeguards

- Merge only when the owner asked for it by name. Turn on auto-merge only with `--auto`.
- Never merge over failed or running checks, and never with `--admin`.
- Never pass `--force` or `--yes` to `wt` on the owner's behalf, except the `-D` in the worktree
  step after the state reads `MERGED`.
