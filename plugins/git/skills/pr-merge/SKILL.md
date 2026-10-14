---
name: pr-merge
description: Merge the current branch's pull request with a merge commit through gh-axi, delete the branch, and return to the base branch.
allowed-tools:
  - Bash(git rev-parse:*)
  - Bash(git status:*)
  - Bash(git remote:*)
  - Bash(git worktree:*)
  - Bash(git checkout:*)
  - Bash(git pull:*)
  - Bash(git push:*)
  - Bash(npx -y gh-axi:*)
  - Bash(wt:*)
---

# PR Merge

Merge the current PR with a merge commit, delete the remote branch, switch back to the base branch,
and pull latest. Every GitHub operation runs through `npx -y gh-axi`; the bare `gh` CLI is never
invoked directly.

## Steps

1. Run `git rev-parse --abbrev-ref HEAD` for the current branch and `git status --short` for the
   working tree.
1. Run `npx -y gh-axi repo view`. Its `branch:` line is the repository's default branch; call it
   `<base>`. gh-axi does not print a pull request's own base branch, so run
   `npx -y gh-axi pr list --head <branch> --base <base>` and take `<number>` from the one row it
   returns. No row means the branch has no open pull request against `<base>`: report that and
   stop.
1. Read `<owner>` from `git remote get-url origin`, whose path ends in `<owner>/<repo>` with or
   without `.git`. gh-axi's `repo view` does not print the owner.
1. Run `git worktree list`. The first line is the main worktree. When the current directory is any
   other worktree, the branch owns a linked worktree and step 6 replaces steps 5, 7 and 8.
1. Merge, substituting the real values into both lines:

```
SUBJECT="Merge pull request #<number> from <owner>/<branch> (#<number>)"
npx -y gh-axi pr merge <number> --merge --delete-branch --subject "$SUBJECT"
```

1. Linked worktree only. `git checkout <base>` fails there because `<base>` is checked out in the
   main worktree, and gh's local branch cleanup trips on the same thing, so merge without
   `--delete-branch` and hand the cleanup to worktrunk:

```
npx -y gh-axi pr merge <number> --merge --subject "$SUBJECT"
git push origin --delete <branch>
git -C <main-worktree-path> pull
wt remove <branch>
```

   `wt remove` tears down the worktree and deletes the branch once it is merged; pulling the main
   worktree first is what lets it see the merge.

1. Run `git checkout <base>`.
1. Run `git pull`.
1. Report success, quoting the merge commit subject, or the specific failure mode if any step fails.

## Safeguards

- Bail if there's no PR associated with the current branch.
- Bail if working tree isn't clean (report what's uncommitted).
- Do not force-merge over failing checks, report them and wait for user direction.
- The merge method is a merge commit. Do not substitute another method, and do not drop `--subject`;
  the trailing `(#<number>)` is the convention this repository's history follows.
- Do not pass `--force-delete` or `--force` to `wt remove` on the operator's behalf. If worktrunk
  refuses because the branch looks unmerged or the worktree is dirty, report that and stop.
